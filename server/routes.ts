import type { Express } from "express";
import { createServer, type Server } from "http";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import formidable from "formidable";
import fetch from "node-fetch";
import FormData from "form-data";
import PDFParser from "pdf2json"; // ✅ local PDF text extractor
import { storage } from "./storage";
import {
  insertUserSchema,
  insertCommentSchema,
  insertLikeSchema,
  insertBookmarkSchema,
} from "@shared/schema";
import { summarizeText, detectFakeNews, chatWithAI } from "./services/openai";
import { fetchNews } from "./services/newsapi";

const JWT_SECRET =
  process.env.SESSION_SECRET ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30";

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

// ---------------- Helper: Extract text from PDF ----------------
const extractTextFromPDF = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", (errData: any) =>
      reject(errData.parserError)
    );
    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const pages = pdfData.formImage.Pages || [];
        const text = pages
          .map((page: any) =>
            page.Texts.map((t: any) =>
              decodeURIComponent(t.R.map((r: any) => r.T).join(""))
            ).join(" ")
          )
          .join("\n\n");
        resolve(text.trim());
      } catch (err) {
        reject(err);
      }
    });
    pdfParser.loadPDF(filePath);
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
          /* skip duplicates */
        }
      }
      const articles = await storage.getArticles(category);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  // ---------------- Summarizer Routes ----------------

  // Text summarizer
  app.post("/api/summarize/text", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text?.trim()) return res.status(400).json({ message: "Text is required" });

      const summary = await summarizeText(text, "text");
      res.json({ summary });
    } catch (error: any) {
      console.error("Text summarizer error:", error);
      res.status(500).json({ message: error.message || "Failed to summarize text" });
    }
  });

  // URL summarizer (with HTML content extraction)
  app.post("/api/summarize/url", async (req, res) => {
    try {
      const { url, input } = req.body;
      const link = (url || input || "").trim();
      if (!link) return res.status(400).json({ message: "URL is required" });

      // Fetch article HTML and extract readable text
      const response = await fetch(link);
      if (!response.ok)
        return res.status(400).json({ message: "Unable to fetch the provided URL" });
      const html = await response.text();

      // Extract visible text (basic version)
      const text = html
        .replace(/<script[^>]*>.*?<\/script>/gs, "")
        .replace(/<style[^>]*>.*?<\/style>/gs, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const summary = await summarizeText(text, "link");
      res.json({ summary });
    } catch (error: any) {
      console.error("URL summarizer error:", error);
      res.status(500).json({ message: error.message || "Failed to summarize URL" });
    }
  });

  // YouTube summarizer (transcript via OpenAI)
  app.post("/api/summarize/youtube", async (req, res) => {
    try {
      const { url, input } = req.body;
      const yt = (url || input || "").trim();
      if (!yt) return res.status(400).json({ message: "YouTube URL required" });

      const summary = await summarizeText(yt, "youtube");
      res.json({ summary });
    } catch (error: any) {
      console.error("YouTube summarizer error:", error);
      res.status(500).json({ message: error.message || "Failed to summarize YouTube video" });
    }
  });

  // ✅ PDF summarizer using pdf2json (no pdf-parse, no pdf.co)
  app.post("/api/summarize/pdf", async (req, res) => {
    try {
      const form = new formidable.IncomingForm({ keepExtensions: true });
      form.parse(req, async (err, fields, files: any) => {
        if (err) return res.status(400).json({ message: "File upload failed" });

        const file = files.file;
        if (!file) return res.status(400).json({ message: "No file uploaded" });

        const filePath = file.filepath || file.path;
        const extractedText = await extractTextFromPDF(filePath);

        if (!extractedText || extractedText.length < 30)
          return res.status(400).json({ message: "PDF contains no readable text" });

        const summary = await summarizeText(extractedText, "pdf");
        res.json({ summary });
      });
    } catch (error: any) {
      console.error("PDF summarizer error:", error);
      res.status(500).json({ message: error.message || "Failed to summarize PDF" });
    }
  });

  // ---------------- Fake News Check ----------------
  app.post("/api/fakecheck", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text?.trim()) return res.status(400).json({ message: "Text required" });

      const result = await detectFakeNews(text);
      res.json(result);
    } catch (error: any) {
      console.error("Fake news error:", error);
      res.status(500).json({ message: error.message || "Failed to check authenticity" });
    }
  });

  // ---------------- AI Chat ----------------
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      if (!message?.trim())
        return res.status(400).json({ message: "Message is required" });

      const response = await chatWithAI(message, context);
      res.json({ response });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ message: error.message || "Failed to get AI response" });
    }
  });

  // ---------------- Authentication ----------------
  app.post("/api/user/signup", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser =
        (await storage.getUserByEmail(userData.email)) ||
        (await storage.getUserByUsername(userData.username));
      if (existingUser)
        return res.status(400).json({ message: "User already exists" });

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({ ...userData, password: hashedPassword });
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      res.json({
        user: { id: user.id, username: user.username, email: user.email },
        token,
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/user/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password)
        return res.status(400).json({ message: "Username & password required" });

      const user =
        (await storage.getUserByUsername(username)) ||
        (await storage.getUserByEmail(username));
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(401).json({ message: "Invalid credentials" });

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      res.json({
        user: { id: user.id, username: user.username, email: user.email },
        token,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // ---------------- Article Like / Comment / Bookmark ----------------
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
    } catch (error) {
      console.error("Like error:", error);
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  app.get("/api/articles/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const comments = await storage.getCommentsByArticle(id);
      res.json(comments);
    } catch (error) {
      console.error("Fetch comments error:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/articles/:id/comment", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const commentData = insertCommentSchema.parse({
        ...req.body,
        userId,
        articleId: id,
      });
      const comment = await storage.createComment(commentData);
      res.json(comment);
    } catch (error) {
      console.error("Comment error:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
