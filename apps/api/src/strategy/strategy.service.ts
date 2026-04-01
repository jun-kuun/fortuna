import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { STRATEGY_TEMPLATES } from './strategy.templates';

@Injectable()
export class StrategyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolioService: PortfolioService,
  ) {}

  // ── Templates ──

  getTemplates() {
    return STRATEGY_TEMPLATES;
  }

  // ── Profiles CRUD ──

  async getProfiles() {
    return this.prisma.strategyProfile.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProfile(data: { name: string; allocations: Record<string, number> }) {
    return this.prisma.strategyProfile.create({
      data: {
        name: data.name,
        allocations: data.allocations,
      },
    });
  }

  async updateProfile(id: string, data: { name?: string; allocations?: Record<string, number> }) {
    return this.prisma.strategyProfile.update({
      where: { id },
      data,
    });
  }

  async deleteProfile(id: string) {
    return this.prisma.strategyProfile.delete({ where: { id } });
  }

  // ── Rebalancing ──

  async computeRebalance(allocations: Record<string, number>) {
    const allocationData = await this.portfolioService.getAllocation();
    const summary = await this.portfolioService.getSummary();
    const totalValue = summary.totalValue;

    const currentByType: Record<string, { value: number; percentage: number }> = {};
    for (const a of allocationData) {
      currentByType[a.type] = { value: a.value, percentage: a.percentage };
    }

    const allTypes = [
      'KOREAN_STOCK', 'OVERSEAS_STOCK', 'REAL_ESTATE', 'DEPOSIT', 'GOLD', 'OTHER',
    ];

    return allTypes.map((type) => {
      const current = currentByType[type] ?? { value: 0, percentage: 0 };
      const targetPercent = allocations[type] ?? 0;
      const targetValue = totalValue * (targetPercent / 100);
      const diff = targetValue - current.value;

      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      if (diff > 1000) action = 'BUY';
      else if (diff < -1000) action = 'SELL';

      return {
        assetType: type,
        currentValue: current.value,
        currentPercent: current.percentage,
        targetValue,
        targetPercent,
        diff,
        action,
      };
    });
  }

  // ── Return History ──

  async getReturnHistory(period: 'monthly' | 'quarterly' = 'monthly') {
    const transactions = await this.prisma.transaction.findMany({
      orderBy: { date: 'asc' },
      include: { asset: { include: { holding: true } } },
    });

    if (transactions.length === 0) return [];

    const assets = await this.prisma.asset.findMany({ include: { holding: true } });
    const currentPriceMap: Record<string, number> = {};
    for (const asset of assets) {
      if (asset.holding) {
        currentPriceMap[asset.id] = asset.holding.currentPrice;
      }
    }

    const earliest = new Date(transactions[0].date);
    const now = new Date();
    const buckets: Date[] = [];

    const cursor = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const step = period === 'quarterly' ? 3 : 1;
    while (cursor <= now) {
      buckets.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + step);
    }
    if (buckets[buckets.length - 1].getTime() < now.getTime()) {
      buckets.push(new Date(now.getFullYear(), now.getMonth(), 1));
    }

    const result: Array<{
      date: string;
      totalValue: number;
      totalCost: number;
      returnRate: number;
      byType: Record<string, { value: number; cost: number }>;
    }> = [];

    for (let i = 0; i < buckets.length; i++) {
      const bucketEnd = new Date(buckets[i]);
      bucketEnd.setMonth(bucketEnd.getMonth() + step);

      const holdingsAtPoint: Record<string, { quantity: number; totalCost: number; lastPrice: number; type: string }> = {};

      for (const tx of transactions) {
        if (new Date(tx.date) > buckets[i]) break;

        if (!holdingsAtPoint[tx.assetId]) {
          holdingsAtPoint[tx.assetId] = {
            quantity: 0,
            totalCost: 0,
            lastPrice: 0,
            type: tx.asset.type,
          };
        }

        const h = holdingsAtPoint[tx.assetId];
        if (tx.type === 'BUY') {
          h.totalCost += tx.quantity * tx.price + tx.fee;
          h.quantity += tx.quantity;
        } else {
          const sellRatio = h.quantity > 0 ? tx.quantity / h.quantity : 0;
          h.totalCost -= h.totalCost * sellRatio;
          h.quantity -= tx.quantity;
        }
        h.lastPrice = tx.price;
      }

      const isLastBucket = i === buckets.length - 1;
      let totalValue = 0;
      let totalCost = 0;
      const byType: Record<string, { value: number; cost: number }> = {};

      for (const [assetId, h] of Object.entries(holdingsAtPoint)) {
        const price = isLastBucket && currentPriceMap[assetId]
          ? currentPriceMap[assetId]
          : h.lastPrice;
        const value = h.quantity * price;
        totalValue += value;
        totalCost += h.totalCost;

        if (!byType[h.type]) byType[h.type] = { value: 0, cost: 0 };
        byType[h.type].value += value;
        byType[h.type].cost += h.totalCost;
      }

      const returnRate = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

      result.push({
        date: buckets[i].toISOString().slice(0, 7),
        totalValue,
        totalCost,
        returnRate,
        byType,
      });
    }

    return result;
  }

  // ── Goals CRUD + Projection ──

  async getGoals() {
    return this.prisma.investmentGoal.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createGoal(data: { name: string; targetAmount: number; targetDate: string; monthlyInvestment?: number }) {
    return this.prisma.investmentGoal.create({
      data: {
        name: data.name,
        targetAmount: data.targetAmount,
        targetDate: new Date(data.targetDate),
        monthlyInvestment: data.monthlyInvestment ?? 0,
      },
    });
  }

  async deleteGoal(id: string) {
    return this.prisma.investmentGoal.delete({ where: { id } });
  }

  async getGoalProjection(id: string) {
    const goal = await this.prisma.investmentGoal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('Goal not found');

    const summary = await this.portfolioService.getSummary();
    const currentValue = summary.totalValue;

    const returnHistory = await this.getReturnHistory('monthly');
    let cagr = 0;
    if (returnHistory.length >= 2) {
      const first = returnHistory[0];
      const last = returnHistory[returnHistory.length - 1];
      if (first.totalCost > 0 && last.totalValue > 0) {
        const years = returnHistory.length / 12;
        if (years > 0) {
          cagr = Math.pow(last.totalValue / first.totalCost, 1 / years) - 1;
        }
      }
    }

    const monthlyRate = Math.pow(1 + cagr, 1 / 12) - 1;
    const targetDate = new Date(goal.targetDate);
    const now = new Date();
    const monthsRemaining = Math.max(
      0,
      (targetDate.getFullYear() - now.getFullYear()) * 12 +
        (targetDate.getMonth() - now.getMonth()),
    );

    const monthly = goal.monthlyInvestment ?? 0;

    const monthlyProjections: Array<{ date: string; value: number }> = [];
    for (let i = 0; i <= monthsRemaining; i++) {
      const projDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      // 기존 자산 복리 + 매월 추가 투자 적립
      const assetGrowth = currentValue * Math.pow(1 + monthlyRate, i);
      const investmentGrowth = monthlyRate > 0
        ? monthly * (Math.pow(1 + monthlyRate, i) - 1) / monthlyRate
        : monthly * i;
      monthlyProjections.push({
        date: projDate.toISOString().slice(0, 7),
        value: assetGrowth + investmentGrowth,
      });
    }

    const projectedFinalValue = monthlyProjections.length > 0
      ? monthlyProjections[monthlyProjections.length - 1].value
      : currentValue;

    return {
      goalId: goal.id,
      goalName: goal.name,
      currentValue,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate.toISOString().slice(0, 10),
      projectedFinalValue,
      monthlyInvestment: monthly,
      cagr: cagr * 100,
      onTrack: projectedFinalValue >= goal.targetAmount,
      shortfall: Math.max(0, goal.targetAmount - projectedFinalValue),
      monthlyProjections,
    };
  }
}
