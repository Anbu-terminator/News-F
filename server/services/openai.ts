import axios from "axios";
import fetch from "node-fetch";
import puppeteer from "puppeteer-core";
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
if (!YOUTUBE_API_KEY) {
  throw new Error(
    "❌ YouTube API key missing. Add it to .env as YOUTUBE_API_KEY"
  );
}

const CHAT_MODEL = "deepseek-ai/DeepSeek-R1:fireworks-ai";
const SUMMARIZER_MODEL = "facebook/bart-large-cnn";

export const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: HUGGINGFACE_API_KEY,
});

// -------------------- HF Summarizer --------------------
async function hfSummarize(text: string): Promise<string> {
  try {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) return "No text to summarize.";

    const words = cleaned.split(" ");
    const chunkSize = 500;
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunkText = words.slice(i, i + chunkSize).join(" ").trim();
      if (chunkText.length > 0) chunks.push(chunkText);
    }

    if (chunks.length === 0) return "Text too short to summarize.";

    const summaries: string[] = [];

    for (const chunk of chunks) {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${SUMMARIZER_MODEL}`,
        { inputs: chunk },
        {
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = response.data;
      if (Array.isArray(result) && result[0]?.summary_text) {
        summaries.push(result[0].summary_text);
      } else if (result?.summary_text) {
        summaries.push(result.summary_text);
      } else if (result?.error) {
        summaries.push(`(Chunk summarization failed: ${result.error})`);
      } else {
        summaries.push("(Chunk summarization failed: unknown response)");
      }
    }

    if (summaries.length > 1) {
      const merged = summaries.join(" ");
      if (merged.split(" ").length <= 500) return merged;
      return await hfSummarize(merged);
    }

    return summaries[0] || "Summarization failed.";
  } catch (err: any) {
    console.error("HF Summarizer error:", err.message || err);
    return "AI temporarily unavailable.";
  }
}

// -------------------- RULE-BASED FALLBACK --------------------
export function ruleBasedTextSummarizer(text: string): string {
  const sentences = text
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length <= 2) return text;
  const summaryCount = Math.min(3, sentences.length);
  const summaryIndices = [0, Math.floor(sentences.length / 2), sentences.length - 1].slice(
    0,
    summaryCount
  );
  return summaryIndices.map((i) => sentences[i]).join(". ") + ".";
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
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
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
      if (!cleanedText) return "Failed to extract text. Please copy-paste article content.";

      return await hfSummarize(cleanedText);
    }

    // YouTube -> use YouTube Data API title + description (robust)
    if (type === "youtube" && typeof input === "string") {
      // extract id from various youtube URL formats
      const videoIdMatch = input.match(/v=([^&]+)/) || input.match(/youtu\.be\/([^?&]+)/);
      if (!videoIdMatch) return "Invalid YouTube URL.";
      const videoId = videoIdMatch[1];

      try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
        const response = await axios.get(url, { timeout: 15000 });

        const items = response.data?.items;
        if (!items || items.length === 0) return "Video not found.";

        const snippet = items[0].snippet || {};
        const title = snippet.title || "";
        const description = snippet.description || "";

        // combine safely and trim
        let textToSummarize = `${title}. ${description}`.replace(/\s+/g, " ").trim();
        if (!textToSummarize) return "No content to summarize from this video.";

        // if description is extremely long, hfSummarize will chunk safely
        return await hfSummarize(textToSummarize);
      } catch (err: any) {
        console.error("YouTube summarizer error:", err.response?.data || err.message || err);
        return "Unable to fetch video details. Please provide text manually.";
      }
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
        {
          role: "system",
          content: "You are a helpful news assistant. Answer clearly and concisely.",
        },
        {
          role: "user",
          content: context ? `Context: ${context}\nUser: ${message}` : message,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return completion.choices?.[0]?.message?.content?.trim() || "AI returned an empty response.";
  } catch (err: any) {
    console.error("Chat error:", err.response?.data || err.message || err);
    return "AI chat model unavailable. Check your Hugging Face OpenRouter API key and model.";
  }
}

// -------------------- FAKE NEWS DETECTION --------------------
export async function detectFakeNews(text: string): Promise<{isReal:boolean,confidence:number,reasoning:string}> {
  const trustedSources = ["the hindu","times of india","indian express","hindustan times","ndtv",
  "business standard","mint","economic times","deccan herald","the telegraph india","dna india","outlook india","livemint","news18",
  "pti","dina thanthi","dinamalar","dinakaran","maalaimalar","puthiya thalaimurai","polimer news","sun tv","vikatan",
  "ananda vikatan","malayala manorama","mathrubhumi","eenadu","sakshi","lokmat","gujarat samachar","rajasthan patrika",
  "punjab kesari","bbc","reuters","ap news","associated press","the guardian","cnn","new york times","washington post",
  "the economist","financial times","wall street journal","bloomberg","al jazeera","sky news","abc news","cbs news",
  "nbc news","fox news","the times uk","the telegraph uk","nature","science magazine","scientific american",
  "techcrunch","wired","the verge","ars technica","engadget","cnet","forbes","fortune","business insider",
  "marketwatch","yahoo finance","cnbc","investopedia"];

  const lowerText = text.toLowerCase();
  for(const src of trustedSources){
    if(lowerText.includes(src)){
      return {isReal:true,confidence:0.95,reasoning:`Trusted source: ${src}`};
    }
  }

  const prompt = `SYSTEM: You are a fact-checking assistant. Analyze this text for misinformation.
Respond in valid JSON format ONLY: { "isReal": boolean, "confidence": number, "reasoning": string }
USER: Text to analyze: ${text}`;

  try{
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages:[{role:"user",content:prompt}]
    });

    const raw = completion.choices?.[0]?.message?.content||"{}";
    const jsonString = raw.replace(/```json/g,"").replace(/```/g,"").trim();
    const result = JSON.parse(jsonString);

    return {
      isReal: result.isReal??false,
      confidence: Math.min(Math.max(result.confidence??0.5,0),1),
      reasoning: result.reasoning?.slice(0,500)??"Analysis unavailable"
    };
  } catch(err:any){
    console.error("Fake news detection error:", err.message||err);
    return {isReal:false,confidence:0.3,reasoning:"Temporarily unavailable - try again later"};
  }
}

// -------------------- YouTube helper --------------------
export async function fetchYouTubeVideos(query:string,maxResults:number=5):Promise<any[]>{
  try{
    const url=`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
    const response = await axios.get(url);
    if(!response.data?.items || response.data.items.length===0) return [];
    return response.data.items.map((item:any)=>({
      title:item.snippet?.title||"",
      description:item.snippet?.description||"",
      publishedAt:item.snippet?.publishedAt||"",
      videoId:item.id?.videoId||"",
      channelTitle:item.snippet?.channelTitle||"",
      thumbnail:item.snippet?.thumbnails?.high?.url||""
    }));
  } catch(err:any){
    console.error("Error fetching YouTube videos:",err?.message||err);
    return [];
  }
}
