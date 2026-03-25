import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

export interface NewsItem {
  title: string;
  description: string;
  link: string;
  source: string;
  pubDate: string;
  category: 'market' | 'asset';
  relatedAsset?: string;
}

interface CacheEntry {
  items: NewsItem[];
  fetchedAt: number;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private marketCache: CacheEntry | null = null;
  private assetCache: Map<string, CacheEntry> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 */30 8-22 * * 1-5', { timeZone: 'Asia/Seoul' })
  async scheduledNewsFetch() {
    this.logger.log('Running scheduled news fetch...');
    await this.getMarketNews(true);
  }

  async getMarketNews(forceRefresh = false): Promise<NewsItem[]> {
    if (
      !forceRefresh &&
      this.marketCache &&
      Date.now() - this.marketCache.fetchedAt < this.CACHE_TTL
    ) {
      return this.marketCache.items;
    }

    const keywords = [
      '코스피',
      '나스닥',
      'S&P500',
      '환율 달러',
      '금시세',
      '주식시장',
    ];
    const allItems: NewsItem[] = [];

    // Google News Korea - Business/Finance topic
    try {
      const topicItems = await this.fetchGoogleNewsTopic();
      allItems.push(...topicItems);
    } catch (e) {
      this.logger.warn(`Failed to fetch Google News topic: ${e.message}`);
    }

    // Keyword-based search
    for (const keyword of keywords) {
      try {
        const items = await this.fetchGoogleNewsSearch(keyword, 'market');
        allItems.push(...items);
      } catch (e) {
        this.logger.warn(
          `Failed to fetch news for keyword ${keyword}: ${e.message}`,
        );
      }
      await new Promise((r) => setTimeout(r, 300)); // rate limit
    }

    const deduped = this.deduplicateAndSort(allItems).slice(0, 30);
    this.marketCache = { items: deduped, fetchedAt: Date.now() };
    return deduped;
  }

  async getAssetNews(assetId?: string): Promise<NewsItem[]> {
    let assets: Array<{
      id: string;
      name: string;
      ticker: string | null;
      type: string;
    }>;

    if (assetId) {
      const asset = await this.prisma.asset.findUnique({
        where: { id: assetId },
      });
      if (!asset) return [];
      assets = [asset];
    } else {
      assets = await this.prisma.asset.findMany({
        where: { type: { in: ['KOREAN_STOCK', 'OVERSEAS_STOCK', 'GOLD'] } },
      });
    }

    const allItems: NewsItem[] = [];

    for (const asset of assets) {
      const cacheKey = asset.id;
      const cached = this.assetCache.get(cacheKey);
      if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL) {
        allItems.push(...cached.items);
        continue;
      }

      const searchTerm =
        asset.type === 'GOLD' ? '금값 금시세' : `${asset.name} 주식`;
      try {
        const items = await this.fetchGoogleNewsSearch(
          searchTerm,
          'asset',
          asset.name,
        );
        this.assetCache.set(cacheKey, { items, fetchedAt: Date.now() });
        allItems.push(...items);
      } catch (e) {
        this.logger.warn(
          `Failed to fetch news for ${asset.name}: ${e.message}`,
        );
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    return this.deduplicateAndSort(allItems).slice(0, 30);
  }

  async getAllNews(): Promise<{ market: NewsItem[]; assets: NewsItem[] }> {
    const [market, assets] = await Promise.all([
      this.getMarketNews(),
      this.getAssetNews(),
    ]);
    return { market, assets };
  }

  private async fetchGoogleNewsTopic(): Promise<NewsItem[]> {
    const url =
      'https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNRGx6TVdZU0FtdHZLQUFQAQ?hl=ko&gl=KR&ceid=KR:ko';
    const text = await this.fetchRss(url);
    return this.parseRssItems(text, 'market');
  }

  private async fetchGoogleNewsSearch(
    keyword: string,
    category: 'market' | 'asset',
    relatedAsset?: string,
  ): Promise<NewsItem[]> {
    const encoded = encodeURIComponent(keyword);
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=ko&gl=KR&ceid=KR:ko`;
    const text = await this.fetchRss(url);
    return this.parseRssItems(text, category, relatedAsset).slice(0, 5);
  }

  private async fetchRss(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });
    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }
    return response.text();
  }

  private parseRssItems(
    xml: string,
    category: 'market' | 'asset',
    relatedAsset?: string,
  ): NewsItem[] {
    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = this.extractTag(itemXml, 'title');
      const description = this.stripHtml(
        this.extractTag(itemXml, 'description'),
      );
      const link = this.extractTag(itemXml, 'link');
      const source =
        this.extractTag(itemXml, 'source') ||
        this.extractSourceFromTitle(title);
      const pubDate = this.extractTag(itemXml, 'pubDate');

      if (title) {
        items.push({
          title: this.decodeHtmlEntities(title),
          description: this.decodeHtmlEntities(description).slice(0, 200),
          link,
          source: this.decodeHtmlEntities(source),
          pubDate: pubDate || new Date().toISOString(),
          category,
          ...(relatedAsset ? { relatedAsset } : {}),
        });
      }
    }

    return items;
  }

  private extractTag(xml: string, tag: string): string {
    // Handle CDATA
    const cdataRegex = new RegExp(
      `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`,
    );
    const cdataMatch = cdataRegex.exec(xml);
    if (cdataMatch) return cdataMatch[1].trim();

    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
    const match = regex.exec(xml);
    return match ? match[1].trim() : '';
  }

  private extractSourceFromTitle(title: string): string {
    const match = / - (.+)$/.exec(title);
    return match ? match[1] : '';
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  private deduplicateAndSort(items: NewsItem[]): NewsItem[] {
    const seen = new Set<string>();
    const unique = items.filter((item) => {
      const key = item.title.slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.sort(
      (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
    );
  }
}
