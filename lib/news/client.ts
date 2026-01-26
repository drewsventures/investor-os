/**
 * News API Client
 * Fetches company news from external news APIs
 *
 * Supports multiple providers:
 * - NewsAPI.org (primary)
 * - Google News RSS (fallback, no API key needed)
 */

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: Date;
  source: {
    name: string;
    url?: string;
  };
  author: string | null;
  imageUrl?: string | null;
}

export interface NewsSearchOptions {
  query: string;
  fromDate?: Date;
  toDate?: Date;
  language?: string;
  sortBy?: 'relevancy' | 'publishedAt' | 'popularity';
  pageSize?: number;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    source: { id: string | null; name: string };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
  }>;
}

/**
 * NewsAPI.org Client
 * Requires NEWS_API_KEY environment variable
 * Free tier: 100 requests/day
 */
export class NewsAPIClient {
  private apiKey: string;
  private baseUrl = 'https://newsapi.org/v2';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEWS_API_KEY || '';
  }

  /**
   * Check if client is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Search for news articles
   */
  async search(options: NewsSearchOptions): Promise<NewsArticle[]> {
    if (!this.isConfigured()) {
      console.warn('NewsAPI not configured - NEWS_API_KEY not set');
      return [];
    }

    const params = new URLSearchParams({
      q: options.query,
      language: options.language || 'en',
      sortBy: options.sortBy || 'publishedAt',
      pageSize: String(options.pageSize || 10),
    });

    if (options.fromDate) {
      params.set('from', options.fromDate.toISOString().split('T')[0]);
    }
    if (options.toDate) {
      params.set('to', options.toDate.toISOString().split('T')[0]);
    }

    const response = await fetch(`${this.baseUrl}/everything?${params}`, {
      headers: {
        'X-Api-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NewsAPI error: ${response.status} - ${error}`);
    }

    const data: NewsAPIResponse = await response.json();

    return data.articles.map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      publishedAt: new Date(article.publishedAt),
      source: {
        name: article.source.name,
      },
      author: article.author,
      imageUrl: article.urlToImage,
    }));
  }

  /**
   * Search for company news using company name and optional domain
   */
  async searchCompanyNews(
    companyName: string,
    options: Omit<NewsSearchOptions, 'query'> = {}
  ): Promise<NewsArticle[]> {
    // Build a search query that's more likely to find relevant news
    // Use quotes for exact company name match
    const query = `"${companyName}"`;

    return this.search({
      ...options,
      query,
      sortBy: 'publishedAt',
    });
  }
}

/**
 * Google News RSS Parser (no API key required)
 * Useful as a fallback or for organizations without NewsAPI key
 */
export async function fetchGoogleNewsRSS(
  query: string,
  maxResults = 10
): Promise<NewsArticle[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Google News RSS error:', response.status);
      return [];
    }

    const xml = await response.text();
    return parseGoogleNewsRSS(xml, maxResults);
  } catch (error) {
    console.error('Failed to fetch Google News RSS:', error);
    return [];
  }
}

/**
 * Parse Google News RSS XML
 */
function parseGoogleNewsRSS(xml: string, maxResults: number): NewsArticle[] {
  const articles: NewsArticle[] = [];

  // Simple regex-based XML parsing (for lightweight dependencies)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && articles.length < maxResults) {
    const item = match[1];

    const title = extractXMLValue(item, 'title');
    const link = extractXMLValue(item, 'link');
    const pubDate = extractXMLValue(item, 'pubDate');
    const source = extractXMLValue(item, 'source');

    if (title && link) {
      articles.push({
        title: decodeHTMLEntities(title),
        description: null,
        url: link,
        publishedAt: pubDate ? new Date(pubDate) : new Date(),
        source: {
          name: source ? decodeHTMLEntities(source) : 'Google News',
        },
        author: null,
      });
    }
  }

  return articles;
}

function extractXMLValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`);
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

/**
 * Combined news fetcher that tries multiple sources
 */
export async function fetchCompanyNews(
  companyName: string,
  options: Omit<NewsSearchOptions, 'query'> = {}
): Promise<NewsArticle[]> {
  const newsAPI = new NewsAPIClient();

  // Try NewsAPI first if configured
  if (newsAPI.isConfigured()) {
    try {
      const articles = await newsAPI.searchCompanyNews(companyName, options);
      if (articles.length > 0) {
        return articles;
      }
    } catch (error) {
      console.error('NewsAPI failed, falling back to Google News:', error);
    }
  }

  // Fallback to Google News RSS
  return fetchGoogleNewsRSS(companyName, options.pageSize || 10);
}
