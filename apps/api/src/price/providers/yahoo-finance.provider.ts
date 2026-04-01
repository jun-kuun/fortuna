import { Injectable, Logger } from '@nestjs/common';
import { PriceProvider, PriceResult } from './price-provider.interface';

@Injectable()
export class YahooFinanceProvider implements PriceProvider {
  private readonly logger = new Logger(YahooFinanceProvider.name);

  async fetchPrice(ticker: string): Promise<PriceResult | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;

      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Yahoo API returned ${response.status} for ${ticker}`);
        return null;
      }

      const data = await response.json();
      const result = data?.chart?.result?.[0];

      if (!result) {
        this.logger.warn(`No chart result for ${ticker}`);
        return null;
      }

      const price = result.meta?.regularMarketPrice;
      const prevClose = result.meta?.previousClose ?? result.meta?.chartPreviousClose;
      const currency = result.meta?.currency ?? 'USD';

      if (!price || isNaN(price)) {
        this.logger.warn(`Could not parse price for ${ticker}`);
        return null;
      }

      let priceChange: number | undefined;
      let priceChangePercent: number | undefined;
      if (prevClose && !isNaN(prevClose) && prevClose > 0) {
        priceChange = price - prevClose;
        priceChangePercent = (priceChange / prevClose) * 100;
      }

      return {
        ticker,
        price,
        priceChange,
        priceChangePercent,
        currency,
        fetchedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch ${ticker}: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch USD/KRW exchange rate
   */
  async fetchExchangeRate(): Promise<number | null> {
    const result = await this.fetchPrice('KRW=X');
    return result?.price ?? null;
  }

  /**
   * Fetch gold price in KRW per gram
   * Gold futures (GC=F) are in USD per troy ounce
   * 1 troy ounce = 31.1035 grams
   */
  async fetchGoldPriceKRW(usdKrwRate: number): Promise<{ price: number; priceChange?: number; priceChangePercent?: number } | null> {
    const result = await this.fetchPrice('GC=F');
    if (!result) return null;

    const krwPerGram = (result.price / 31.1035) * usdKrwRate;
    return {
      price: Math.round(krwPerGram),
      priceChange: result.priceChange != null ? Math.round((result.priceChange / 31.1035) * usdKrwRate) : undefined,
      priceChangePercent: result.priceChangePercent,
    };
  }
}
