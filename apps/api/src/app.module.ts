import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AssetsModule } from './assets/assets.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { TransactionsModule } from './transactions/transactions.module';
import { StrategyModule } from './strategy/strategy.module';
import { InsightsModule } from './insights/insights.module';
import { PriceModule } from './price/price.module';
import { NewsModule } from './news/news.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AssetsModule,
    PortfolioModule,
    TransactionsModule,
    StrategyModule,
    InsightsModule,
    PriceModule,
    NewsModule,
  ],
})
export class AppModule {}
