import { Injectable, Logger } from '@nestjs/common';
import { PriceProvider, PriceResult } from './price-provider.interface';

@Injectable()
export class KoreanStockProvider implements PriceProvider {
  private readonly logger = new Logger(KoreanStockProvider.name);

  async fetchPrice(ticker: string): Promise<PriceResult | null> {
    try {
      const response = await fetch(
        `https://m.stock.naver.com/api/stock/${ticker}/basic`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
        },
      );

      if (!response.ok) {
        this.logger.warn(`Naver API returned ${response.status} for ${ticker}`);
        return null;
      }

      const data = await response.json();

      // Naver mobile API returns comma-formatted strings like "8,805"
      const strip = (v: string | undefined) =>
        v ? parseFloat(v.replace(/,/g, '')) : NaN;

      const price =
        strip(data.closePrice) ||
        strip(data.currentPrice);

      if (!price || isNaN(price)) {
        this.logger.warn(`Could not parse price for Korean stock ${ticker}`);
        return null;
      }

      return {
        ticker,
        price,
        currency: 'KRW',
        fetchedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch Korean stock ${ticker}: ${error.message}`);
      return null;
    }
  }
}
