import fs from "fs";
import axios from "axios";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import OpenAI from "openai";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// -------------------- CONFIG --------------------
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHAT_MODEL = "deepseek-ai/DeepSeek-R1:fireworks-ai";

// -------------------- OPENAI CLIENT --------------------
export const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: HUGGINGFACE_API_KEY,
});

// -------------------- RULE-BASED SUMMARIZER --------------------
export function ruleBasedTextSummarizer(text: string): string {
  const sentences = text
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length <= 3) return text;

  const summaryCount = Math.min(4, sentences.length);
  const summaryIndices = [
    0,
    Math.floor(sentences.length / 3),
    Math.floor((2 * sentences.length) / 3),
    sentences.length - 1,
  ].slice(0, summaryCount);

  return summaryIndices.map((i) => sentences[i]).join(". ") + ".";
}

// -------------------- PDF READER --------------------
export async function readPdfContent(pdfBuffer: Buffer): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    let fullText = "";

    for (const page of pages) {
      const textContent = await page.getTextContent?.();
      if (textContent && textContent.items) {
        fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
      }
    }

    if (!fullText.trim()) return "No readable text found in PDF.";
    return fullText.replace(/\s+/g, " ").trim();
  } catch (err) {
    console.error("PDF read error:", err);
    return "Failed to read PDF file.";
  }
}
// -------------------- PDF GENERATOR --------------------
export async function generatePdfFromText(text: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;

  const lines = text.split("\n");
  let y = 780;

  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= fontSize + 5;
    if (y < 50) break; // Stop if page is full
  }

  return await pdfDoc.save();
}

// -------------------- SUMMARIZER ENTRY --------------------
export async function summarizeText(
  input: string | Buffer,
  type: "text" | "link" | "youtube" | "pdf" = "text"
): Promise<string> {
  try {
    if (type === "text" && typeof input === "string") return ruleBasedTextSummarizer(input);

    if (type === "pdf") {
      const pdfText = await readPdfContent(input);
      if (!pdfText || pdfText.trim().length === 0) return "No readable text extracted from the PDF.";
      return ruleBasedTextSummarizer(pdfText);
    }

    if (type === "link" && typeof input === "string") {
      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
      const page = await browser.newPage();
      await page.goto(input, { waitUntil: "domcontentloaded", timeout: 60000 });
      const textContent: string = await page.evaluate(() => document.body.innerText || "");
      await browser.close();
      return textContent ? ruleBasedTextSummarizer(textContent) : "Failed to extract text from webpage.";
    }

    if (type === "youtube" && typeof input === "string") {
      const videoIdMatch = input.match(/v=([^&]+)/) || input.match(/youtu\.be\/([^?&]+)/);
      if (!videoIdMatch) return "Invalid YouTube URL.";
      const videoId = videoIdMatch[1];
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
      const response = await axios.get(url);
      const snippet = response.data?.items?.[0]?.snippet;
      if (!snippet) return "Video not found.";
      const textToSummarize = `${snippet.title || ""}. ${snippet.description || ""}`;
      return ruleBasedTextSummarizer(textToSummarize);
    }

    return "Unsupported summarization type.";
  } catch (err: any) {
    console.error("Summarizer entry error:", err.message || err);
    return "Summarization failed due to internal error.";
  }
}

// -------------------- CHATBOT --------------------
export async function chatWithAI(message: string, context?: string): Promise<string> {
  try {
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: "You are a helpful news assistant. Answer clearly and concisely." },
        { role: "user", content: context ? `Context: ${context}\nUser: ${message}` : message },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return completion.choices?.[0]?.message?.content?.trim() || "AI returned an empty response.";
  } catch (err: any) {
    console.error("Chat error:", err.response?.data || err.message || err);
    return "AI chat model unavailable. Check your API key.";
  }
}

// -------------------- FAKE NEWS DETECTION --------------------
export async function detectFakeNews(text: string): Promise<{ isReal: boolean; confidence: number; reasoning: string }> {
  const trustedSources = [
    "the hindu","times of india","indian express","hindustan times","ndtv","business standard",
    "mint","economic times","deccan herald","the telegraph india","dna india","outlook india",
    "livemint","news18","pti","dina thanthi","dinamalar","dinakaran","maalaimalar","puthiya thalaimurai",
    "polimer news","sun tv","vikatan","ananda vikatan","malayala manorama","mathrubhumi","eenadu",
    "sakshi","lokmat","gujarat samachar","rajasthan patrika","punjab kesari","bbc","reuters",
    "ap news","associated press","the guardian","cnn","new york times","washington post",
    "the economist","financial times","wall street journal","bloomberg","al jazeera","sky news",
    "abc news","cbs news","nbc news","fox news","nature","science magazine","scientific american",
    "techcrunch","wired","the verge","ars technica","engadget","cnet","forbes","fortune",
    "business insider","marketwatch","yahoo finance","cnbc","investopedia",
  ];

  const lowerText = text.toLowerCase();

  for (const src of trustedSources) {
    if (lowerText.includes(src)) return { isReal: true, confidence: 0.95, reasoning: `Trusted source: ${src}` };
  }

  if (lowerText.includes("shocking") || lowerText.includes("breaking") || lowerText.includes("miracle"))
    return { isReal: false, confidence: 0.3, reasoning: "Sensational language indicates possible misinformation." };

  if (lowerText.length < 100) return { isReal: false, confidence: 0.4, reasoning: "Too short to verify credibility." };

  return { isReal: false, confidence: 0.5, reasoning: "Source not verified against trusted list." };
}

// -------------------- YouTube Helper --------------------
export async function fetchYouTubeVideos(query: string, maxResults: number = 5): Promise<any[]> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
      query
    )}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;

    const response = await axios.get(url);
    if (!response.data?.items || response.data.items.length === 0) return [];

    return response.data.items.map((item: any) => ({
      title: item.snippet?.title || "",
      description: item.snippet?.description || "",
      publishedAt: item.snippet?.publishedAt || "",
      videoId: item.id?.videoId || "",
      channelTitle: item.snippet?.channelTitle || "",
      thumbnail: item.snippet?.thumbnails?.high?.url || "",
    }));
  } catch (err: any) {
    console.error("Error fetching YouTube videos:", err?.message || err);
    return [];
  }
}
