import { Module } from '@nestjs/common';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
import { KoreanStockProvider } from './providers/korean-stock.provider';
import { YahooFinanceProvider } from './providers/yahoo-finance.provider';

@Module({
  controllers: [PriceController],
  providers: [PriceService, KoreanStockProvider, YahooFinanceProvider],
  exports: [PriceService],
})
export class PriceModule {}
