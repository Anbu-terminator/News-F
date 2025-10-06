import fs from "fs";
import axios from "axios";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import OpenAI from "openai";

// -------------------- CONFIG --------------------
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHAT_MODEL = "deepseek-ai/DeepSeek-R1:fireworks-ai";

// Chatbot client
export const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: HUGGINGFACE_API_KEY,
});

// -------------------- LOCAL RULE-BASED SUMMARIZER --------------------
export function ruleBasedTextSummarizer(text: string): string {
  try {
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
  } catch (err) {
    console.error("Rule summarizer error:", err);
    return "Failed to summarize text.";
  }
}

// -------------------- PDF SUMMARIZER (Server-Side) --------------------
export async function summarizePdfBuffer(pdfBuffer: Buffer): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf");
    const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items
        .map((item: any) => item.str || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim() + "\n\n";
    }

    return ruleBasedTextSummarizer(fullText);
  } catch (err: any) {
    console.error("PDF summarization error:", err.message || err);
    return "Failed to summarize PDF.";
  }
}

// -------------------- SUMMARIZER ENTRY --------------------
export async function summarizeText(
  input: string | Buffer,
  type: "text" | "link" | "youtube" | "pdf" = "text"
): Promise<string> {
  try {
    if (type === "text" && typeof input === "string") {
      return ruleBasedTextSummarizer(input);
    }

    if (type === "pdf") {
      let pdfBuffer: Buffer;
      if (Buffer.isBuffer(input)) pdfBuffer = input;
      else if (typeof input === "string") pdfBuffer = Buffer.from(input, "base64");
      else throw new Error("Invalid PDF input type");

      console.log("📄 Summarizing PDF locally...");
      return summarizePdfBuffer(pdfBuffer);
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

      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("script, style, noscript, iframe"));
        elements.forEach((el) => el.remove());
      });

      const textContent: string = await page.evaluate(() => document.body.innerText || "");
      await browser.close();

      const cleanedText = textContent.replace(/\s+/g, " ").trim();
      return cleanedText ? ruleBasedTextSummarizer(cleanedText) : "Failed to extract text from webpage.";
    }

    if (type === "youtube" && typeof input === "string") {
      const videoIdMatch = input.match(/v=([^&]+)/) || input.match(/youtu\.be\/([^?&]+)/);
      if (!videoIdMatch) return "Invalid YouTube URL.";

      const videoId = videoIdMatch[1];
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
      const response = await axios.get(url);
      const items = response.data?.items;
      if (!items || items.length === 0) return "Video not found.";

      const snippet = items[0].snippet || {};
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
