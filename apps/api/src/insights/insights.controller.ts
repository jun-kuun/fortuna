import { Controller, Get, Query } from '@nestjs/common';
import { InsightsService } from './insights.service';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('health-check')
  getHealthCheck() {
    return this.insightsService.getHealthCheck();
  }

  @Get('monthly-report')
  getMonthlyReport(@Query('month') month?: string) {
    return this.insightsService.getMonthlyReport(month);
  }

  @Get('timing-analysis')
  getTimingAnalysis() {
    return this.insightsService.getTimingAnalysis();
  }

  @Get('habits')
  getHabits() {
    return this.insightsService.getHabits();
  }
}
