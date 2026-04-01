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
        strip(data.currentPrice) ||
        strip(data.closePrice);

      if (!price || isNaN(price)) {
        this.logger.warn(`Could not parse price for Korean stock ${ticker}`);
        return null;
      }

      // 전일 대비 변동액/변동률
      const comparePrice = strip(data.compareToPreviousClosePrice);
      const direction = data.compareToPreviousPrice?.name;
      const fluctRatio = parseFloat(data.fluctuationsRatio);
      let priceChange: number | undefined;
      let priceChangePercent: number | undefined;
      if (comparePrice && !isNaN(comparePrice)) {
        priceChange = direction === 'FALLING' ? -comparePrice : comparePrice;
        priceChangePercent = direction === 'FALLING' ? -Math.abs(fluctRatio) : Math.abs(fluctRatio);
      }

      return {
        ticker,
        price,
        priceChange,
        priceChangePercent,
        currency: 'KRW',
        fetchedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch Korean stock ${ticker}: ${error.message}`);
      return null;
    }
  }
}
