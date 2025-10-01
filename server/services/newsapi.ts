import axios from 'axios';

const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY || "pub_e0c15fe8b2ce4cb1bc85b6725c3270e2";
const BASE_URL = 'https://newsdata.io/api/1/news';

interface NewsDataArticle {
  article_id: string;
  title: string;
  link: string;
  keywords?: string[];
  creator?: string[];
  video_url?: string;
  description?: string;
  content?: string;
  pubDate?: string;
  image_url?: string;
  source_id: string;
  source_priority: number;
  country?: string[];
  category?: string[];
  language?: string;
}

interface NewsDataResponse {
  status: string;
  totalResults: number;
  results: NewsDataArticle[];
  nextPage?: string;
}

export async function fetchNews(category?: string, country = 'in', language = 'en'): Promise<NewsDataArticle[]> {
  try {
    const params = new URLSearchParams({
      apikey: NEWSDATA_API_KEY,
      country,
      language,
      size: '10'
    });

    if (category && category !== 'all') {
      params.append('category', category);
    }

    const response = await axios.get<NewsDataResponse>(`${BASE_URL}?${params}`);
    
    if (response.data.status !== 'success') {
      throw new Error('Failed to fetch news from API');
    }

    return response.data.results;
  } catch (error) {
    console.error('Error fetching news:', error);
    // Return empty array on error to prevent app crash
    return [];
  }
}

export async function searchNews(query: string, language = 'en'): Promise<NewsDataArticle[]> {
  try {
    const params = new URLSearchParams({
      apikey: NEWSDATA_API_KEY,
      q: query,
      language,
      size: '10'
    });

    const response = await axios.get<NewsDataResponse>(`${BASE_URL}?${params}`);
    
    if (response.data.status !== 'success') {
      throw new Error('Failed to search news from API');
    }

    return response.data.results;
  } catch (error) {
    console.error('Error searching news:', error);
    return [];
  }
}
