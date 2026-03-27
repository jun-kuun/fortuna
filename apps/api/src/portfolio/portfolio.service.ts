import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const assets = await this.prisma.asset.findMany({
      where: { deletedAt: null },
      include: { holding: true },
    });

    const holdings = assets
      .filter((a) => a.holding)
      .map((asset) => {
        const holding = asset.holding!;
        const currentValue = holding.quantity * holding.currentPrice;
        const totalCost = holding.quantity * holding.avgCostPrice;
        const returnAmount = currentValue - totalCost;
        const returnRate = totalCost > 0 ? (returnAmount / totalCost) * 100 : 0;
        // 예적금은 만기 전 이자 없음 → 손익 0 처리
        const isDeposit = asset.type === 'DEPOSIT';
        const adjustedReturnAmount = isDeposit ? 0 : returnAmount;
        const adjustedReturnRate = isDeposit ? 0 : returnRate;

        return {
          ...holding,
          asset: { ...asset, holding: undefined },
          currentValue,
          totalCost,
          returnAmount: adjustedReturnAmount,
          returnRate: adjustedReturnRate,
        };
      });

    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
    const totalReturn = totalValue - totalCost;
    const totalReturnRate = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalReturn,
      totalReturnRate,
      holdings,
    };
  }

  async getAllocation() {
    const assets = await this.prisma.asset.findMany({
      where: { deletedAt: null },
      include: { holding: true },
    });

    const byType: Record<string, number> = {};
    let totalValue = 0;

    for (const asset of assets) {
      if (!asset.holding) continue;
      const value = asset.holding.quantity * asset.holding.currentPrice;
      byType[asset.type] = (byType[asset.type] ?? 0) + value;
      totalValue += value;
    }

    return Object.entries(byType).map(([type, value]) => ({
      type,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }));
  }
}
