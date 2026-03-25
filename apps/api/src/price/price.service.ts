import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { KoreanStockProvider } from './providers/korean-stock.provider';
import { YahooFinanceProvider } from './providers/yahoo-finance.provider';

export interface PriceUpdateResultItem {
  assetId: string;
  assetName: string;
  ticker: string;
  oldPrice: number;
  newPrice: number;
  status: 'updated' | 'failed' | 'skipped';
  error?: string;
}

export interface PriceUpdateResult {
  updatedCount: number;
  failedCount: number;
  skippedCount: number;
  exchangeRate: { USDKRW: number | null };
  results: PriceUpdateResultItem[];
  updatedAt: string;
}

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);

  // In-memory exchange rate cache (1 hour TTL)
  private exchangeRateCache: { rate: number; fetchedAt: number } | null = null;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly koreanProvider: KoreanStockProvider,
    private readonly yahooProvider: YahooFinanceProvider,
  ) {}

  /**
   * Scheduled: every hour on weekdays (KST)
   */
  @Cron('0 0 8-22 * * 1-5', { timeZone: 'Asia/Seoul' })
  async scheduledPriceUpdate() {
    this.logger.log('Running scheduled price update...');
    const result = await this.updateAllPrices();
    this.logger.log(
      `Scheduled update complete: ${result.updatedCount} updated, ${result.failedCount} failed`,
    );
  }

  async getExchangeRate(): Promise<number | null> {
    // Check cache
    if (
      this.exchangeRateCache &&
      Date.now() - this.exchangeRateCache.fetchedAt < this.CACHE_TTL
    ) {
      return this.exchangeRateCache.rate;
    }

    const rate = await this.yahooProvider.fetchExchangeRate();
    if (rate) {
      this.exchangeRateCache = { rate, fetchedAt: Date.now() };
    }
    return rate;
  }

  async updateAllPrices(): Promise<PriceUpdateResult> {
    const assets = await this.prisma.asset.findMany({
      where: {
        OR: [
          { ticker: { not: null } },
          { type: 'GOLD' },
        ],
      },
      include: { holding: true },
    });

    if (assets.length === 0) {
      return {
        updatedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        exchangeRate: { USDKRW: null },
        results: [],
        updatedAt: new Date().toISOString(),
      };
    }

    // Pre-fetch exchange rate for overseas stocks and gold
    const usdKrwRate = await this.getExchangeRate();

    const results: PriceUpdateResultItem[] = [];
    let updatedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const asset of assets) {
      const ticker = asset.ticker ?? '';
      const oldPrice = asset.holding?.currentPrice ?? 0;

      try {
        let newPrice: number | null = null;

        switch (asset.type) {
          case 'KOREAN_STOCK': {
            if (!ticker) { skippedCount++; results.push({ assetId: asset.id, assetName: asset.name, ticker, oldPrice, newPrice: oldPrice, status: 'skipped' }); continue; }
            const result = await this.koreanProvider.fetchPrice(ticker);
            newPrice = result?.price ?? null;
            break;
          }

          case 'OVERSEAS_STOCK': {
            if (!ticker) { skippedCount++; results.push({ assetId: asset.id, assetName: asset.name, ticker, oldPrice, newPrice: oldPrice, status: 'skipped' }); continue; }
            const result = await this.yahooProvider.fetchPrice(ticker);
            newPrice = result?.price ?? null;
            break;
          }

          case 'GOLD': {
            if (!usdKrwRate) {
              this.logger.warn('Cannot fetch gold price: no exchange rate');
              break;
            }
            newPrice = await this.yahooProvider.fetchGoldPriceKRW(usdKrwRate);
            break;
          }

          default:
            skippedCount++;
            results.push({
              assetId: asset.id,
              assetName: asset.name,
              ticker,
              oldPrice,
              newPrice: oldPrice,
              status: 'skipped',
            });
            continue;
        }

        if (newPrice !== null && !isNaN(newPrice)) {
          await this.prisma.holding.update({
            where: { assetId: asset.id },
            data: {
              currentPrice: newPrice,
              priceUpdatedAt: new Date(),
            },
          });

          updatedCount++;
          results.push({
            assetId: asset.id,
            assetName: asset.name,
            ticker,
            oldPrice,
            newPrice,
            status: 'updated',
          });
        } else {
          failedCount++;
          results.push({
            assetId: asset.id,
            assetName: asset.name,
            ticker,
            oldPrice,
            newPrice: oldPrice,
            status: 'failed',
            error: 'Price fetch returned null',
          });
        }

        // Small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        failedCount++;
        results.push({
          assetId: asset.id,
          assetName: asset.name,
          ticker,
          oldPrice,
          newPrice: oldPrice,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return {
      updatedCount,
      failedCount,
      skippedCount,
      exchangeRate: { USDKRW: usdKrwRate },
      results,
      updatedAt: new Date().toISOString(),
    };
  }

  async updateAssetPrice(assetId: string): Promise<PriceUpdateResultItem> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: { holding: true },
    });

    if (!asset) {
      return {
        assetId,
        assetName: '',
        ticker: '',
        oldPrice: 0,
        newPrice: 0,
        status: 'failed',
        error: 'Asset not found',
      };
    }

    if (!asset.ticker && asset.type !== 'GOLD') {
      return {
        assetId,
        assetName: asset.name,
        ticker: '',
        oldPrice: asset.holding?.currentPrice ?? 0,
        newPrice: asset.holding?.currentPrice ?? 0,
        status: 'skipped',
        error: 'No ticker configured',
      };
    }

    const oldPrice = asset.holding?.currentPrice ?? 0;
    let newPrice: number | null = null;

    try {
      switch (asset.type) {
        case 'KOREAN_STOCK': {
          const result = await this.koreanProvider.fetchPrice(asset.ticker!);
          newPrice = result?.price ?? null;
          break;
        }
        case 'OVERSEAS_STOCK': {
          const result = await this.yahooProvider.fetchPrice(asset.ticker!);
          newPrice = result?.price ?? null;
          break;
        }
        case 'GOLD': {
          const usdKrwRate = await this.getExchangeRate();
          if (usdKrwRate) {
            newPrice = await this.yahooProvider.fetchGoldPriceKRW(usdKrwRate);
          }
          break;
        }
      }

      if (newPrice !== null && !isNaN(newPrice)) {
        await this.prisma.holding.update({
          where: { assetId: asset.id },
          data: {
            currentPrice: newPrice,
            priceUpdatedAt: new Date(),
          },
        });

        return {
          assetId,
          assetName: asset.name,
          ticker: asset.ticker ?? 'GC=F',
          oldPrice,
          newPrice,
          status: 'updated',
        };
      }

      return {
        assetId,
        assetName: asset.name,
        ticker: asset.ticker ?? 'GC=F',
        oldPrice,
        newPrice: oldPrice,
        status: 'failed',
        error: 'Price fetch returned null',
      };
    } catch (error) {
      return {
        assetId,
        assetName: asset.name,
        ticker: asset.ticker ?? 'GC=F',
        oldPrice,
        newPrice: oldPrice,
        status: 'failed',
        error: error.message,
      };
    }
  }
}
