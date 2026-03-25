import { Module } from '@nestjs/common';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { StrategyModule } from '../strategy/strategy.module';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

@Module({
  imports: [PortfolioModule, StrategyModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
