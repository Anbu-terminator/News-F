import type { Express } from "express";
import { createServer, type Server } from "http";
import jwt from "jsonwebtoken";
import fs from "fs";
import bcrypt from "bcrypt";
import formidable from "formidable";
import fetch from "node-fetch";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertCommentSchema,
  insertLikeSchema,
} from "@shared/schema";
import { summarizeText, detectFakeNews, chatWithAI } from "./services/openai";
import { fetchNews } from "./services/newsapi";

const JWT_SECRET = process.env.SESSION_SECRET || "supersecretdefaultkey";

// ---------------- Middleware ----------------
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

// ---------------- Register Routes ----------------
export async function registerRoutes(app: Express): Promise<Server> {
  // 🌐 News Fetch
  app.get("/api/news", async (req, res) => {
    try {
      const { category } = req.query as { category?: string };
      const externalNews = await fetchNews(category);
      for (const article of externalNews) {
        try {
          await storage.createArticle({
            title: article.title,
            description: article.description || null,
            content: article.content || null,
            url: article.link,
            imageUrl: article.image_url || null,
            category: article.category?.[0] || "general",
            source: article.source_id,
            publishedAt: article.pubDate ? new Date(article.pubDate) : null,
          });
        } catch {
          // skip duplicates
        }
      }
      const articles = await storage.getArticles(category);
      res.json(articles);
    } catch (error: any) {
      console.error("Error fetching news:", error);
      res.status(500).json({ message: error.message || "Failed to fetch news" });
    }
  });

  // ---------------- Text Summarizer ----------------
  app.post("/api/summarize/text", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text?.trim()) return res.status(400).json({ message: "Text is required" });
      const summary = await summarizeText(text, "text");
      res.json({ summary });
    } catch (err: any) {
      console.error("Text summarizer error:", err);
      res.status(500).json({ message: err.message || "Failed to summarize text" });
    }
  });

  app.post("/api/summarize/url", async (req, res) => {
    try {
      const { url, input } = req.body;
      const link = (url || input || "").trim();
      if (!link) return res.status(400).json({ message: "URL is required" });

      const response = await fetch(link);
      if (!response.ok) return res.status(400).json({ message: "Unable to fetch URL" });
      const html = await response.text();

      const text = html
        .replace(/<script[^>]*>.*?<\/script>/gs, "")
        .replace(/<style[^>]*>.*?<\/style>/gs, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const summary = await summarizeText(text, "link");
      res.json({ summary });
    } catch (err: any) {
      console.error("URL summarizer error:", err);
      res.status(500).json({ message: err.message || "Failed to summarize URL" });
    }
  });

  app.post("/api/summarize/youtube", async (req, res) => {
    try {
      const { url, input } = req.body;
      const yt = (url || input || "").trim();
      if (!yt) return res.status(400).json({ message: "YouTube URL required" });
      const summary = await summarizeText(yt, "youtube");
      res.json({ summary });
    } catch (err: any) {
      console.error("YouTube summarizer error:", err);
      res.status(500).json({ message: err.message || "Failed to summarize YouTube video" });
    }
  });

  // ---------------- PDF Summarizer ----------------
  app.post("/api/summarize/pdf", async (req, res) => {
    try {
      const form = formidable({ keepExtensions: true });
      form.parse(req, async (err, fields, files: any) => {
        if (err) return res.status(400).json({ message: "File upload failed" });

        const file = files.file;
        if (!file) return res.status(400).json({ message: "No file uploaded" });

        try {
          const fileBuffer = await fs.promises.readFile(file.filepath || file.path);
          const summary = await summarizeText(fileBuffer, "pdf");

          if (!summary || summary.length < 10)
            return res.status(400).json({ message: "PDF contains no readable text" });

          res.json({ summary });
        } catch (pdfErr: any) {
          console.error("PDF extraction error:", pdfErr);
          res.status(500).json({ message: pdfErr.message || "Failed to extract text from PDF" });
        } finally {
          fs.unlink(file.filepath || file.path, () => {});
        }
      });
    } catch (err: any) {
      console.error("PDF summarizer error:", err);
      res.status(500).json({ message: err.message || "Failed to summarize PDF" });
    }
  });

  // ---------------- Fake News ----------------
  app.post("/api/fakecheck", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text?.trim()) return res.status(400).json({ message: "Text required" });
      const result = await detectFakeNews(text);
      res.json(result);
    } catch (err: any) {
      console.error("Fake news error:", err);
      res.status(500).json({ message: err.message || "Failed to check authenticity" });
    }
  });

  // ---------------- AI Chat ----------------
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message is required" });
      const response = await chatWithAI(message, context);
      res.json({ response });
    } catch (err: any) {
      console.error("Chat error:", err);
      res.status(500).json({ message: err.message || "Failed to get AI response" });
    }
  });

  // ---------------- Authentication ----------------
  app.post("/api/user/signup", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser =
        (await storage.getUserByEmail(userData.email)) ||
        (await storage.getUserByUsername(userData.username));
      if (existingUser) return res.status(400).json({ message: "User already exists" });

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({ ...userData, password: hashedPassword });
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
    } catch (err: any) {
      console.error("Signup error:", err);
      res.status(500).json({ message: err.message || "Failed to create user" });
    }
  });

  app.post("/api/user/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ message: "Username & password required" });

      const user =
        (await storage.getUserByUsername(username)) ||
        (await storage.getUserByEmail(username));
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(401).json({ message: "Invalid credentials" });

      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ message: err.message || "Failed to login" });
    }
  });

  // ---------------- Article Interactions ----------------
  app.post("/api/articles/:id/like", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const existingLike = await storage.getUserLike(userId, id);
      if (existingLike) {
        await storage.deleteLike(userId, id);
        res.json({ liked: false });
      } else {
        await storage.createLike({ userId, articleId: id });
        res.json({ liked: true });
      }
    } catch (err) {
      console.error("Like error:", err);
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  app.get("/api/articles/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const comments = await storage.getCommentsByArticle(id);
      res.json(comments);
    } catch (err) {
      console.error("Fetch comments error:", err);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/articles/:id/comment", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const commentData = insertCommentSchema.parse({ ...req.body, userId, articleId: id });
      const comment = await storage.createComment(commentData);
      res.json(comment);
    } catch (err) {
      console.error("Comment error:", err);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
