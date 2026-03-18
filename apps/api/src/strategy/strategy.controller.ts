import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query,
} from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { RebalanceRequestDto } from './dto/rebalance-request.dto';

@Controller('strategy')
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  // ── Templates ──

  @Get('templates')
  getTemplates() {
    return this.strategyService.getTemplates();
  }

  // ── Profiles ──

  @Get('profiles')
  getProfiles() {
    return this.strategyService.getProfiles();
  }

  @Post('profiles')
  createProfile(@Body() dto: CreateProfileDto) {
    return this.strategyService.createProfile(dto);
  }

  @Patch('profiles/:id')
  updateProfile(@Param('id') id: string, @Body() dto: Partial<CreateProfileDto>) {
    return this.strategyService.updateProfile(id, dto);
  }

  @Delete('profiles/:id')
  deleteProfile(@Param('id') id: string) {
    return this.strategyService.deleteProfile(id);
  }

  // ── Rebalance ──

  @Post('rebalance')
  rebalance(@Body() dto: RebalanceRequestDto) {
    return this.strategyService.computeRebalance(dto.allocations);
  }

  // ── Return History ──

  @Get('return-history')
  getReturnHistory(@Query('period') period?: 'monthly' | 'quarterly') {
    return this.strategyService.getReturnHistory(period ?? 'monthly');
  }

  // ── Goals ──

  @Get('goals')
  getGoals() {
    return this.strategyService.getGoals();
  }

  @Post('goals')
  createGoal(@Body() dto: CreateGoalDto) {
    return this.strategyService.createGoal(dto);
  }

  @Delete('goals/:id')
  deleteGoal(@Param('id') id: string) {
    return this.strategyService.deleteGoal(id);
  }

  @Get('goals/:id/projection')
  getGoalProjection(@Param('id') id: string) {
    return this.strategyService.getGoalProjection(id);
  }
}
