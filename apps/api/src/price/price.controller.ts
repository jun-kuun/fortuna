import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PriceService } from './price.service';

@Controller('prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Post('update-all')
  updateAll() {
    return this.priceService.updateAllPrices();
  }

  @Post('update/:assetId')
  updateOne(@Param('assetId') assetId: string) {
    return this.priceService.updateAssetPrice(assetId);
  }

  @Get('history/:assetId')
  getHistory(
    @Param('assetId') assetId: string,
    @Query('days') days?: string,
  ) {
    const d = Math.min(365, Math.max(1, parseInt(days ?? '30', 10) || 30));
    return this.priceService.getPriceHistory(assetId, d);
  }

  @Get('exchange-rate')
  async getExchangeRate() {
    const rate = await this.priceService.getExchangeRate();
    return { USDKRW: rate, fetchedAt: new Date().toISOString() };
  }
}
