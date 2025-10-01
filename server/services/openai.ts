import axios from "axios";
import fetch from "node-fetch";
import * as puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import OpenAI from "openai";

// -------------------- CONFIG --------------------
const HUGGINGFACE_API_KEY =
  process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;

if (!HUGGINGFACE_API_KEY) {
  throw new Error(
    "❌ Hugging Face API key missing. Add it to .env as HUGGINGFACE_API_KEY or HF_TOKEN"
  );
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// ✅ Stable Hugging Face models
const SUMMARIZER_MODEL = "sshleifer/distilbart-cnn-12-6"; // Extractive summarizer
const CHAT_MODEL = "deepseek-ai/DeepSeek-R1:fireworks-ai"; // Router chat model

// Create Hugging Face OpenAI-compatible client
export const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: HUGGINGFACE_API_KEY,
});

// -------------------- LOCAL RULE-BASED TEXT SUMMARIZER --------------------
export function ruleBasedTextSummarizer(text: string): string {
  const sentences = text
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length <= 2) return text;
  const summaryCount = Math.min(3, sentences.length);
  const summaryIndices = [
    0,
    Math.floor(sentences.length / 2),
    sentences.length - 1,
  ].slice(0, summaryCount);
  return summaryIndices.map((i) => sentences[i]).join(". ") + ".";
}

// -------------------- HF Summarizer --------------------
async function hfSummarize(text: string): Promise<string> {
  try {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) return "No text to summarize.";

    // 🔑 Using Hugging Face inference API directly
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${SUMMARIZER_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: cleaned }),
      }
    );

    if (response.status === 401) {
      throw new Error(
        "❌ Hugging Face token invalid or expired – regenerate at https://huggingface.co/settings/tokens"
      );
    }

    const result: any = await response.json();

    if (Array.isArray(result) && result[0]?.summary_text)
      return result[0].summary_text;
    if (result?.summary_text) return result.summary_text;

    console.error("HF Summarizer unexpected response:", result);
    return "Summarization failed. HF API returned no summary.";
  } catch (err: any) {
    console.error("HF Summarizer error:", err.message || err);
    return err.message?.includes("Hugging Face token")
      ? err.message
      : "AI temporarily unavailable.";
  }
}

// -------------------- SUMMARIZER ENTRY --------------------
export async function summarizeText(
  input: string | Buffer,
  type: "text" | "link" | "youtube" | "pdf" = "text"
): Promise<string> {
  try {
    if (type === "text" && typeof input === "string") {
      return await hfSummarize(input);
    }

   if (type === "link" && typeof input === "string") {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.goto(input, { waitUntil: "networkidle2" });

  await page.evaluate(() => {
    document.querySelectorAll("script, style, noscript, iframe")
      .forEach((el) => el.remove());
  });

  const textContent: string = await page.evaluate(
    () => document.body.innerText || ""
  );
  await browser.close();

  const cleanedText = textContent.replace(/\s+/g, " ").trim();
  if (!cleanedText)
    return "Failed to extract text. Please copy-paste article content.";

  return await hfSummarize(cleanedText);
}
    if (type === "youtube" && typeof input === "string") {
      const videoIdMatch =
        input.match(/v=([^&]+)/) || input.match(/youtu\.be\/([^?]+)/);
      if (!videoIdMatch) return "Invalid YouTube URL.";
      const videoId = videoIdMatch[1];

      try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
        const response = await axios.get(url);

        if (!response.data.items || response.data.items.length === 0)
          return "Video not found or API quota exceeded.";

        const snippet = response.data.items[0].snippet;
        const textContent = `Title: ${snippet.title}\nDescription: ${snippet.description}`;
        return await hfSummarize(textContent);
      } catch (err: any) {
        console.error("YouTube Data API error:", err.message || err);
        return "Unable to fetch video details. Please provide text manually.";
      }
    }

    return "Invalid input type.";
  } catch (err: any) {
    console.error("Summarizer error:", err.message || err);
    return "Unable to summarize content.";
  }
}

// -------------------- CHATBOT --------------------
export async function chatWithAI(
  message: string,
  context?: string
): Promise<string> {
  try {
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful news assistant. Answer clearly and concisely.",
        },
        {
          role: "user",
          content: context
            ? `Context: ${context}\nUser: ${message}`
            : message,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const reply = completion.choices?.[0]?.message?.content;
    if (!reply || !reply.trim()) {
      throw new Error("Empty response from AI");
    }

    return reply.trim();
  } catch (err: any) {
    if (err.status === 401) {
      console.error(
        "❌ Hugging Face token invalid or expired – regenerate at https://huggingface.co/settings/tokens"
      );
      return "Authentication failed. Please update your Hugging Face token.";
    }
    console.error("Error in chatWithAI:", err.response?.data || err.message);
    return "AI model unavailable.";
  }
}

// -------------------- FAKE NEWS DETECTION --------------------
export async function detectFakeNews(text: string): Promise<{
  isReal: boolean;
  confidence: number;
  reasoning: string;
}> {
  const trustedSources = [
    "the hindu",
    "times of india",
    "indian express",
    "hindustan times",
    "ndtv",
    "business standard",
    "mint",
    "economic times",
    "deccan herald",
    "the telegraph india",
    "dna india",
    "outlook india",
    "livemint",
    "news18",
    "pti",
    "dina thanthi",
    "dinamalar",
    "dinakaran",
    "maalaimalar",
    "puthiya thalaimurai",
    "polimer news",
    "sun tv",
    "vikatan",
    "ananda vikatan",
    "malayala manorama",
    "mathrubhumi",
    "eenadu",
    "sakshi",
    "lokmat",
    "gujarat samachar",
    "rajasthan patrika",
    "punjab kesari",
    "bbc",
    "reuters",
    "ap news",
    "associated press",
    "the guardian",
    "cnn",
    "new york times",
    "washington post",
    "the economist",
    "financial times",
    "wall street journal",
    "bloomberg",
    "al jazeera",
    "sky news",
    "abc news",
    "cbs news",
    "nbc news",
    "fox news",
    "the times uk",
    "the telegraph uk",
    "nature",
    "science magazine",
    "scientific american",
    "techcrunch",
    "wired",
    "the verge",
    "ars technica",
    "engadget",
    "cnet",
    "forbes",
    "fortune",
    "business insider",
    "marketwatch",
    "yahoo finance",
    "cnbc",
    "investopedia",
  ];

  const lowerText = text.toLowerCase();
  for (const src of trustedSources) {
    if (lowerText.includes(src)) {
      return {
        isReal: true,
        confidence: 0.95,
        reasoning: `Trusted source: ${src}`,
      };
    }
  }

  const prompt = `SYSTEM: You are a fact-checking assistant. Analyze this text for misinformation.
Respond in valid JSON format ONLY: { "isReal": boolean, "confidence": number, "reasoning": string }
USER: Text to analyze: ${text}`;

  try {
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0].message?.content || "{}";
    const jsonString = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(jsonString);

    return {
      isReal: result.isReal ?? false,
      confidence: Math.min(Math.max(result.confidence ?? 0.5, 0), 1),
      reasoning: result.reasoning?.slice(0, 500) ?? "Analysis unavailable",
    };
  } catch (err: any) {
    if (err.status === 401) {
      console.error(
        "❌ Hugging Face token invalid or expired – regenerate at https://huggingface.co/settings/tokens"
      );
    }
    console.error("Fake news detection error:", err.message || err);
    return {
      isReal: false,
      confidence: 0.3,
      reasoning: "Temporarily unavailable - try again later",
    };
  }
}

// -------------------- YouTube helper --------------------
export async function fetchYouTubeVideos(
  query: string,
  maxResults: number = 5
): Promise<any[]> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
      query
    )}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;

    const response = await axios.get(url);

    if (response.data && response.data.items) {
      return response.data.items.map((item: any) => ({
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        videoId: item.id.videoId,
        channelTitle: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.high?.url,
      }));
    }

    return [];
  } catch (err: any) {
    console.error("Error fetching YouTube videos:", err?.message || err);
    return [];
  }
}
