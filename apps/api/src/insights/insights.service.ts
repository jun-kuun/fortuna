import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { StrategyService } from '../strategy/strategy.service';

export interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  impact: string;
}

const RISK_WEIGHTS: Record<string, number> = {
  DEPOSIT: 1,
  GOLD: 3,
  REAL_ESTATE: 4,
  OTHER: 5,
  KOREAN_STOCK: 6,
  OVERSEAS_STOCK: 7,
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  KOREAN_STOCK: '국내 주식',
  OVERSEAS_STOCK: '해외 주식',
  REAL_ESTATE: '부동산',
  DEPOSIT: '예적금',
  GOLD: '금',
  OTHER: '기타',
};

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolioService: PortfolioService,
    private readonly strategyService: StrategyService,
  ) {}

  // ═══════════════════════════════════════════
  // 1. 포트폴리오 건강 진단
  // ═══════════════════════════════════════════

  async getHealthCheck() {
    const allocation = await this.portfolioService.getAllocation();
    const summary = await this.portfolioService.getSummary();

    if (summary.totalValue === 0) {
      return {
        overallScore: 0,
        overallGrade: 'F' as const,
        dataQuality: 'insufficient',
        diversification: { score: 0, grade: 'F', assetTypeCount: 0, assetCount: 0, hhi: 10000 },
        riskAssessment: { score: 0, level: 'unknown', weightedRisk: 0 },
        rebalancingUrgency: { level: 'NONE', totalDeviation: 0, hasProfile: false },
        cashDrag: { level: 'unknown', depositPercent: 0, opportunityCost: 0 },
        recommendations: [{ priority: 'HIGH' as const, category: '시작', title: '자산을 등록하세요', description: '포트폴리오 분석을 위해 먼저 자산과 거래 내역을 입력해주세요.', impact: '분석 활성화' }],
        generatedAt: new Date().toISOString(),
      };
    }

    const diversification = this.computeDiversification(allocation, summary);
    const riskAssessment = this.computeRiskAssessment(allocation);
    const rebalancingUrgency = await this.computeRebalancingUrgency(allocation);
    const cashDrag = this.computeCashDrag(allocation, summary);
    const recommendations = this.generateRecommendations(diversification, riskAssessment, rebalancingUrgency, cashDrag, allocation);

    const overallScore = Math.round(
      diversification.score * 0.3 +
      (100 - Math.abs(riskAssessment.weightedRisk - 4.5) * 20) * 0.2 + // balanced=best
      Math.max(0, 100 - rebalancingUrgency.totalDeviation * 2) * 0.25 +
      cashDrag.score * 0.25,
    );
    const clampedScore = Math.max(0, Math.min(100, overallScore));

    return {
      overallScore: clampedScore,
      overallGrade: this.scoreToGrade(clampedScore),
      dataQuality: 'sufficient',
      diversification,
      riskAssessment,
      rebalancingUrgency,
      cashDrag,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  private computeDiversification(
    allocation: Array<{ type: string; value: number; percentage: number }>,
    summary: { holdings: any[] },
  ) {
    const percentages = allocation.map((a) => a.percentage);
    const hhi = percentages.reduce((sum, p) => sum + p * p, 0);
    // Perfect spread across 6 types = HHI ~1667, single = 10000
    const minHHI = 10000 / 6; // ~1667
    const rawScore = 100 - ((hhi - minHHI) / (10000 - minHHI)) * 100;

    const assetTypeCount = allocation.length;
    const assetCount = summary.holdings.length;

    // Bonus for more asset types (up to 6), penalty for fewer
    const typeBonus = Math.min(assetTypeCount / 6, 1) * 15;
    const countBonus = Math.min(assetCount / 10, 1) * 10;
    const score = Math.max(0, Math.min(100, rawScore + typeBonus + countBonus));

    return {
      score: Math.round(score),
      grade: this.scoreToGrade(score),
      assetTypeCount,
      assetCount,
      hhi: Math.round(hhi),
    };
  }

  private computeRiskAssessment(allocation: Array<{ type: string; percentage: number }>) {
    let weightedRisk = 0;
    for (const a of allocation) {
      weightedRisk += (RISK_WEIGHTS[a.type] ?? 5) * (a.percentage / 100);
    }

    let level: string;
    if (weightedRisk <= 3) level = 'conservative';
    else if (weightedRisk <= 5) level = 'balanced';
    else level = 'aggressive';

    return {
      score: Math.round(weightedRisk * 10) / 10,
      level,
      weightedRisk: Math.round(weightedRisk * 100) / 100,
    };
  }

  private async computeRebalancingUrgency(allocation: Array<{ type: string; percentage: number }>) {
    const profiles = await this.strategyService.getProfiles();

    if (profiles.length === 0) {
      // Compare against 60/40 as default
      const defaultTarget: Record<string, number> = {
        KOREAN_STOCK: 30, OVERSEAS_STOCK: 30, DEPOSIT: 40,
        REAL_ESTATE: 0, GOLD: 0, OTHER: 0,
      };
      const deviation = this.calcTotalDeviation(allocation, defaultTarget);
      return { level: this.deviationToLevel(deviation), totalDeviation: Math.round(deviation), hasProfile: false };
    }

    const latestProfile = profiles[0];
    const target = latestProfile.allocations as Record<string, number>;
    const deviation = this.calcTotalDeviation(allocation, target);
    return {
      level: this.deviationToLevel(deviation),
      totalDeviation: Math.round(deviation),
      hasProfile: true,
      profileName: latestProfile.name,
    };
  }

  private calcTotalDeviation(
    allocation: Array<{ type: string; percentage: number }>,
    target: Record<string, number>,
  ): number {
    const allTypes = ['KOREAN_STOCK', 'OVERSEAS_STOCK', 'REAL_ESTATE', 'DEPOSIT', 'GOLD', 'OTHER'];
    const currentMap: Record<string, number> = {};
    for (const a of allocation) {
      currentMap[a.type] = a.percentage;
    }
    return allTypes.reduce((sum, t) => sum + Math.abs((currentMap[t] ?? 0) - (target[t] ?? 0)), 0);
  }

  private deviationToLevel(deviation: number): string {
    if (deviation < 10) return 'LOW';
    if (deviation < 25) return 'MEDIUM';
    return 'HIGH';
  }

  private computeCashDrag(
    allocation: Array<{ type: string; value: number; percentage: number }>,
    summary: { totalValue: number; holdings: any[] },
  ) {
    const deposit = allocation.find((a) => a.type === 'DEPOSIT');
    const depositPercent = deposit?.percentage ?? 0;

    let level: string;
    let score: number;
    if (depositPercent > 50) { level = 'severe'; score = 20; }
    else if (depositPercent > 30) { level = 'moderate'; score = 50; }
    else if (depositPercent >= 10) { level = 'healthy'; score = 85; }
    else { level = 'low_liquidity'; score = 65; }

    // Opportunity cost: excess deposit (above 15%) * (avg equity return 8% - deposit rate 3.5%)
    const excessPercent = Math.max(0, depositPercent - 15);
    const excessValue = summary.totalValue * (excessPercent / 100);
    const opportunityCost = excessValue * (0.08 - 0.035); // annual

    return {
      level,
      score: Math.round(score),
      depositPercent: Math.round(depositPercent * 10) / 10,
      opportunityCost: Math.round(opportunityCost),
      opportunityCost5yr: Math.round(excessValue * (Math.pow(1.08, 5) - Math.pow(1.035, 5))),
      opportunityCost10yr: Math.round(excessValue * (Math.pow(1.08, 10) - Math.pow(1.035, 10))),
    };
  }

  private generateRecommendations(
    diversification: any, risk: any, rebalancing: any, cashDrag: any,
    allocation: Array<{ type: string; percentage: number }>,
  ): Recommendation[] {
    const recs: Recommendation[] = [];

    // Diversification recommendations
    if (diversification.assetTypeCount <= 2) {
      recs.push({
        priority: 'HIGH', category: '분산투자',
        title: `${diversification.assetTypeCount}개 유형에만 집중되어 있습니다`,
        description: '자산을 더 다양한 유형으로 분산하세요. 주식, 채권, 부동산, 금 등 서로 상관관계가 낮은 자산에 분산 투자하면 리스크를 줄이면서 안정적 수익을 기대할 수 있습니다.',
        impact: '리스크 대폭 감소',
      });
    } else if (diversification.assetTypeCount <= 3) {
      recs.push({
        priority: 'MEDIUM', category: '분산투자',
        title: '추가 자산 유형 분산을 권장합니다',
        description: '현재 3개 이하 유형에 투자 중입니다. 금이나 부동산 등 대체자산을 추가하면 포트폴리오 안정성이 높아집니다.',
        impact: '안정성 향상',
      });
    }

    // Single asset concentration
    for (const a of allocation) {
      if (a.percentage > 60) {
        recs.push({
          priority: 'HIGH', category: '집중 위험',
          title: `${ASSET_TYPE_LABELS[a.type] ?? a.type} 비중이 ${Math.round(a.percentage)}%입니다`,
          description: '단일 자산 유형 비중이 60%를 넘으면 해당 시장 하락 시 큰 손실 위험이 있습니다. 다른 유형으로 일부 이동을 고려하세요.',
          impact: '리스크 크게 감소',
        });
      }
    }

    // Cash drag
    if (cashDrag.level === 'severe') {
      recs.push({
        priority: 'HIGH', category: '현금 비중',
        title: `예적금 비중 ${cashDrag.depositPercent}% — 자산 성장이 느려지고 있습니다`,
        description: `예적금 초과 보유로 연간 약 ${this.formatKRW(cashDrag.opportunityCost)}의 수익 기회를 놓치고 있습니다. 투자 비중을 높여보세요.`,
        impact: `연 ${this.formatKRW(cashDrag.opportunityCost)} 추가 수익 기대`,
      });
    } else if (cashDrag.level === 'moderate') {
      recs.push({
        priority: 'MEDIUM', category: '현금 비중',
        title: `예적금 비중 ${cashDrag.depositPercent}% — 기회비용이 발생하고 있습니다`,
        description: `적정 비상금(15~20%)을 제외한 나머지를 투자로 전환하면 연간 약 ${this.formatKRW(cashDrag.opportunityCost)}의 추가 수익을 기대할 수 있습니다.`,
        impact: `연 ${this.formatKRW(cashDrag.opportunityCost)} 추가 수익 기대`,
      });
    } else if (cashDrag.level === 'low_liquidity') {
      recs.push({
        priority: 'MEDIUM', category: '유동성',
        title: '비상금이 부족할 수 있습니다',
        description: '예적금 비중이 10% 미만입니다. 최소 3~6개월치 생활비를 비상금으로 확보하는 것이 권장됩니다.',
        impact: '재무 안정성 향상',
      });
    }

    // Rebalancing urgency
    if (rebalancing.level === 'HIGH') {
      recs.push({
        priority: 'HIGH', category: '리밸런싱',
        title: '포트폴리오 배분이 목표와 크게 벗어났습니다',
        description: `총 편차가 ${rebalancing.totalDeviation}%입니다. 투자 전략 페이지에서 리밸런싱을 실행하세요.`,
        impact: '전략 정합성 회복',
      });
    } else if (rebalancing.level === 'MEDIUM') {
      recs.push({
        priority: 'LOW', category: '리밸런싱',
        title: '리밸런싱을 검토해보세요',
        description: `목표 배분 대비 ${rebalancing.totalDeviation}% 편차가 있습니다. 분기에 한 번 리밸런싱을 추천합니다.`,
        impact: '수익률 안정화',
      });
    }

    // Risk level warnings
    if (risk.level === 'aggressive') {
      recs.push({
        priority: 'LOW', category: '리스크',
        title: '공격적 포트폴리오입니다',
        description: '고위험 자산 비중이 높습니다. 장기 투자 계획이 아니라면 안전자산 비중을 높이는 것을 고려하세요.',
        impact: '변동성 완화',
      });
    }

    // No overseas stock
    if (!allocation.find((a) => a.type === 'OVERSEAS_STOCK' && a.percentage > 0)) {
      recs.push({
        priority: 'MEDIUM', category: '글로벌 분산',
        title: '해외 주식 투자를 시작하세요',
        description: '국내 시장에만 투자하면 한국 경제에 과도하게 노출됩니다. 해외 주식으로 글로벌 분산 효과를 얻으세요.',
        impact: '글로벌 분산 효과',
      });
    }

    // Sort by priority
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recs;
  }

  // ═══════════════════════════════════════════
  // 2. 월별 자산 리포트
  // ═══════════════════════════════════════════

  async getMonthlyReport(month?: string) {
    const targetMonth = month ?? new Date().toISOString().slice(0, 7);
    const [year, mon] = targetMonth.split('-').map(Number);

    const returnHistory = await this.strategyService.getReturnHistory('monthly');

    if (returnHistory.length === 0) {
      return {
        month: targetMonth,
        dataQuality: 'insufficient',
        netWorth: 0, previousNetWorth: 0, change: 0, changePercent: 0,
        bestPerformers: [], worstPerformers: [],
        netInflow: 0, milestones: [], growthStreak: 0,
        monthlyHistory: [],
      };
    }

    // Find target month and previous month in history
    const targetIdx = returnHistory.findIndex((r) => r.date === targetMonth);
    const currentData = targetIdx >= 0 ? returnHistory[targetIdx] : returnHistory[returnHistory.length - 1];
    const prevData = targetIdx > 0 ? returnHistory[targetIdx - 1] : (returnHistory.length >= 2 ? returnHistory[returnHistory.length - 2] : null);

    const netWorth = currentData.totalValue;
    const previousNetWorth = prevData?.totalValue ?? 0;
    const change = netWorth - previousNetWorth;
    const changePercent = previousNetWorth > 0 ? (change / previousNetWorth) * 100 : 0;

    // Best/worst performers by asset type
    const typePerformance: Array<{ type: string; name: string; returnRate: number; returnAmount: number }> = [];
    for (const [type, data] of Object.entries(currentData.byType)) {
      const prevTypeData = prevData?.byType[type];
      const prevValue = prevTypeData?.value ?? 0;
      const returnAmount = data.value - (prevValue || data.cost);
      const returnRate = data.cost > 0 ? ((data.value - data.cost) / data.cost) * 100 : 0;
      typePerformance.push({
        type,
        name: ASSET_TYPE_LABELS[type] ?? type,
        returnRate: Math.round(returnRate * 100) / 100,
        returnAmount: Math.round(returnAmount),
      });
    }
    typePerformance.sort((a, b) => b.returnRate - a.returnRate);
    const bestPerformers = typePerformance.filter((p) => p.returnRate > 0).slice(0, 3);
    const worstPerformers = typePerformance.filter((p) => p.returnRate < 0).slice(-3).reverse();

    // Net inflow for the month
    const monthStart = new Date(year, mon - 1, 1);
    const monthEnd = new Date(year, mon, 0, 23, 59, 59);
    const transactions = await this.prisma.transaction.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
    });
    let netInflow = 0;
    for (const tx of transactions) {
      const amount = tx.quantity * tx.price + tx.fee;
      netInflow += tx.type === 'BUY' ? amount : -amount;
    }

    // Milestones
    const milestones: string[] = [];
    const thresholds = [1000000, 5000000, 10000000, 50000000, 100000000, 500000000, 1000000000];
    for (const t of thresholds) {
      if (netWorth >= t && previousNetWorth < t) {
        milestones.push(`${this.formatKRW(t)} 돌파!`);
      }
    }

    // Growth streak
    let growthStreak = 0;
    const effectiveIdx = targetIdx >= 0 ? targetIdx : returnHistory.length - 1;
    for (let i = effectiveIdx; i > 0; i--) {
      if (returnHistory[i].totalValue > returnHistory[i - 1].totalValue) {
        growthStreak++;
      } else {
        break;
      }
    }

    // Last 12 months history
    const startIdx = Math.max(0, effectiveIdx - 11);
    const monthlyHistory = returnHistory.slice(startIdx, effectiveIdx + 1).map((r, i, arr) => ({
      month: r.date,
      netWorth: Math.round(r.totalValue),
      change: i > 0 ? Math.round(r.totalValue - arr[i - 1].totalValue) : 0,
    }));

    return {
      month: targetMonth,
      dataQuality: 'sufficient',
      netWorth: Math.round(netWorth),
      previousNetWorth: Math.round(previousNetWorth),
      change: Math.round(change),
      changePercent: Math.round(changePercent * 100) / 100,
      bestPerformers,
      worstPerformers,
      netInflow: Math.round(netInflow),
      milestones,
      growthStreak,
      monthlyHistory,
    };
  }

  // ═══════════════════════════════════════════
  // 3. 매수/매도 타이밍 인사이트
  // ═══════════════════════════════════════════

  async getTimingAnalysis() {
    const transactions = await this.prisma.transaction.findMany({
      orderBy: { date: 'asc' },
      include: { asset: true },
    });

    if (transactions.length === 0) {
      return {
        dataQuality: 'insufficient',
        holdingPeriods: [],
        buyHighSellLow: [],
        dcaAnalysis: { overallScore: 0, perAsset: [] },
        emotionalTrading: { flags: [] },
      };
    }

    const holdingPeriods = this.computeHoldingPeriods(transactions);
    const buyHighSellLow = this.computeBuyHighSellLow(transactions);
    const dcaAnalysis = this.computeDCAAnalysis(transactions);
    const emotionalTrading = this.detectEmotionalTrading(transactions);

    return {
      dataQuality: 'sufficient',
      holdingPeriods,
      buyHighSellLow,
      dcaAnalysis,
      emotionalTrading,
    };
  }

  private computeHoldingPeriods(transactions: any[]) {
    const byAsset: Record<string, { name: string; type: string; buys: Date[]; sells: Date[]; holdingQty: number }> = {};

    for (const tx of transactions) {
      if (!byAsset[tx.assetId]) {
        byAsset[tx.assetId] = { name: tx.asset.name, type: tx.asset.type, buys: [], sells: [], holdingQty: 0 };
      }
      const a = byAsset[tx.assetId];
      if (tx.type === 'BUY') {
        a.buys.push(new Date(tx.date));
        a.holdingQty += tx.quantity;
      } else {
        a.sells.push(new Date(tx.date));
        a.holdingQty -= tx.quantity;
      }
    }

    const now = new Date();
    return Object.entries(byAsset).map(([assetId, data]) => {
      let avgDays: number;
      if (data.sells.length > 0 && data.buys.length > 0) {
        // FIFO matching
        let totalDays = 0;
        let matchCount = 0;
        const buyQueue = [...data.buys];
        for (const sellDate of data.sells) {
          const buyDate = buyQueue.shift();
          if (buyDate) {
            totalDays += (sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24);
            matchCount++;
          }
        }
        // Add current holdings (unsold)
        for (const buyDate of buyQueue) {
          totalDays += (now.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24);
          matchCount++;
        }
        avgDays = matchCount > 0 ? Math.round(totalDays / matchCount) : 0;
      } else if (data.buys.length > 0) {
        const totalDays = data.buys.reduce((sum, d) => sum + (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24), 0);
        avgDays = Math.round(totalDays / data.buys.length);
      } else {
        avgDays = 0;
      }

      let status: 'short' | 'medium' | 'long';
      if (avgDays < 90) status = 'short';
      else if (avgDays < 365) status = 'medium';
      else status = 'long';

      return { assetId, name: data.name, type: data.type, avgDays, status };
    });
  }

  private computeBuyHighSellLow(transactions: any[]) {
    const byAsset: Record<string, { name: string; type: string; buyPrices: number[]; sellPrices: number[] }> = {};

    for (const tx of transactions) {
      if (!byAsset[tx.assetId]) {
        byAsset[tx.assetId] = { name: tx.asset.name, type: tx.asset.type, buyPrices: [], sellPrices: [] };
      }
      if (tx.type === 'BUY') byAsset[tx.assetId].buyPrices.push(tx.price);
      else byAsset[tx.assetId].sellPrices.push(tx.price);
    }

    return Object.entries(byAsset)
      .filter(([, data]) => data.buyPrices.length >= 2)
      .map(([assetId, data]) => {
        const avgBuy = data.buyPrices.reduce((s, p) => s + p, 0) / data.buyPrices.length;
        const minBuy = Math.min(...data.buyPrices);
        const maxBuy = Math.max(...data.buyPrices);
        const buyRange = maxBuy - minBuy;
        // buyScore: 0 = bought at lowest, 1 = bought at highest
        const buyScore = buyRange > 0 ? (avgBuy - minBuy) / buyRange : 0.5;

        let sellScore = 0.5;
        if (data.sellPrices.length >= 1) {
          const avgSell = data.sellPrices.reduce((s, p) => s + p, 0) / data.sellPrices.length;
          // Compare sell price to buy prices range
          sellScore = buyRange > 0 ? (avgSell - minBuy) / buyRange : 0.5;
        }

        let verdict: 'good' | 'caution' | 'bad';
        if (buyScore < 0.4 && sellScore > 0.6) verdict = 'good';
        else if (buyScore > 0.7 || sellScore < 0.3) verdict = 'bad';
        else verdict = 'caution';

        return {
          assetId,
          name: data.name,
          type: data.type,
          buyScore: Math.round(buyScore * 100) / 100,
          sellScore: Math.round(sellScore * 100) / 100,
          verdict,
        };
      });
  }

  private computeDCAAnalysis(transactions: any[]) {
    const buysByAsset: Record<string, { name: string; dates: Date[]; amounts: number[] }> = {};

    for (const tx of transactions) {
      if (tx.type !== 'BUY') continue;
      if (!buysByAsset[tx.assetId]) {
        buysByAsset[tx.assetId] = { name: tx.asset.name, dates: [], amounts: [] };
      }
      buysByAsset[tx.assetId].dates.push(new Date(tx.date));
      buysByAsset[tx.assetId].amounts.push(tx.quantity * tx.price);
    }

    const perAsset: Array<{ assetId: string; name: string; regularity: number; avgIntervalDays: number; buyCount: number }> = [];

    for (const [assetId, data] of Object.entries(buysByAsset)) {
      if (data.dates.length < 2) {
        perAsset.push({ assetId, name: data.name, regularity: 0, avgIntervalDays: 0, buyCount: data.dates.length });
        continue;
      }

      const intervals: number[] = [];
      for (let i = 1; i < data.dates.length; i++) {
        intervals.push((data.dates[i].getTime() - data.dates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
      }

      const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      const variance = intervals.reduce((s, v) => s + Math.pow(v - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      const cv = avgInterval > 0 ? stdDev / avgInterval : 1;

      // CV 0 = perfect regularity, CV > 1 = very irregular
      const regularity = Math.max(0, Math.min(100, Math.round((1 - Math.min(cv, 1)) * 100)));

      perAsset.push({
        assetId,
        name: data.name,
        regularity,
        avgIntervalDays: Math.round(avgInterval),
        buyCount: data.dates.length,
      });
    }

    const scores = perAsset.filter((p) => p.buyCount >= 2).map((p) => p.regularity);
    const overallScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;

    return { overallScore, perAsset };
  }

  private detectEmotionalTrading(transactions: any[]) {
    const flags: Array<{ period: string; type: 'panic_sell' | 'fomo_buy'; transactionCount: number; description: string }> = [];

    // Look for sell clusters: 3+ sells within 7 days
    const sells = transactions.filter((tx) => tx.type === 'SELL');
    for (let i = 0; i < sells.length; i++) {
      const windowEnd = new Date(sells[i].date);
      windowEnd.setDate(windowEnd.getDate() + 7);
      const cluster = sells.filter(
        (s) => new Date(s.date) >= new Date(sells[i].date) && new Date(s.date) <= windowEnd,
      );
      if (cluster.length >= 3) {
        const period = new Date(sells[i].date).toISOString().slice(0, 10);
        if (!flags.find((f) => f.period === period && f.type === 'panic_sell')) {
          flags.push({
            period,
            type: 'panic_sell',
            transactionCount: cluster.length,
            description: `7일 내 ${cluster.length}건의 매도 — 패닉셀 가능성`,
          });
        }
      }
    }

    // Look for buy clusters: 3+ buys within 3 days (FOMO)
    const buys = transactions.filter((tx) => tx.type === 'BUY');
    for (let i = 0; i < buys.length; i++) {
      const windowEnd = new Date(buys[i].date);
      windowEnd.setDate(windowEnd.getDate() + 3);
      const cluster = buys.filter(
        (b) => new Date(b.date) >= new Date(buys[i].date) && new Date(b.date) <= windowEnd,
      );
      if (cluster.length >= 3) {
        const period = new Date(buys[i].date).toISOString().slice(0, 10);
        if (!flags.find((f) => f.period === period && f.type === 'fomo_buy')) {
          flags.push({
            period,
            type: 'fomo_buy',
            transactionCount: cluster.length,
            description: `3일 내 ${cluster.length}건의 매수 — FOMO 매수 가능성`,
          });
        }
      }
    }

    flags.sort((a, b) => b.period.localeCompare(a.period));
    return { flags };
  }

  // ═══════════════════════════════════════════
  // 4. 재무 습관 트래커
  // ═══════════════════════════════════════════

  async getHabits() {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    const transactions = await this.prisma.transaction.findMany({
      where: { date: { gte: twelveMonthsAgo } },
      orderBy: { date: 'asc' },
      include: { asset: true },
    });

    if (transactions.length === 0) {
      return {
        dataQuality: 'insufficient',
        consistencyScore: 0,
        monthsInvested: 0,
        monthlyActivity: [],
        diversificationTrend: { current: 0, sixMonthsAgo: 0, improving: false },
        turnoverRate: { rate: 0, level: 'unknown' as const },
        wealthVelocity: { annualRate: 0, absoluteGrowth: 0 },
      };
    }

    // Consistency: how many of the last 12 months had at least one BUY
    const monthsWithBuys = new Set<string>();
    const monthlyActivity: Array<{ month: string; buyCount: number; sellCount: number; netInflow: number }> = [];
    const activityMap: Record<string, { buyCount: number; sellCount: number; netInflow: number }> = {};

    for (const tx of transactions) {
      const monthKey = new Date(tx.date).toISOString().slice(0, 7);
      if (!activityMap[monthKey]) activityMap[monthKey] = { buyCount: 0, sellCount: 0, netInflow: 0 };
      const amount = tx.quantity * tx.price;
      if (tx.type === 'BUY') {
        monthsWithBuys.add(monthKey);
        activityMap[monthKey].buyCount++;
        activityMap[monthKey].netInflow += amount;
      } else {
        activityMap[monthKey].sellCount++;
        activityMap[monthKey].netInflow -= amount;
      }
    }

    const monthlyActivityArr = Object.entries(activityMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    const consistencyScore = Math.round((monthsWithBuys.size / 12) * 100);

    // Diversification trend
    const returnHistory = await this.strategyService.getReturnHistory('monthly');
    let currentHHI = 0;
    let sixMonthsAgoHHI = 0;

    if (returnHistory.length > 0) {
      const latest = returnHistory[returnHistory.length - 1];
      currentHHI = this.computeHHIFromByType(latest.byType);
      const sixIdx = Math.max(0, returnHistory.length - 7);
      sixMonthsAgoHHI = this.computeHHIFromByType(returnHistory[sixIdx].byType);
    }

    // Turnover rate
    const summary = await this.portfolioService.getSummary();
    const totalSellValue12m = transactions
      .filter((tx) => tx.type === 'SELL')
      .reduce((sum, tx) => sum + tx.quantity * tx.price, 0);
    const avgPortfolioValue = summary.totalValue > 0 ? summary.totalValue : 1;
    const turnoverRate = (totalSellValue12m / avgPortfolioValue) * 100;

    let turnoverLevel: 'patient' | 'moderate' | 'active' | 'unknown';
    if (turnoverRate < 20) turnoverLevel = 'patient';
    else if (turnoverRate < 50) turnoverLevel = 'moderate';
    else turnoverLevel = 'active';

    // Wealth velocity
    const currentValue = summary.totalValue;
    const earliestValue = returnHistory.length > 0 ? returnHistory[Math.max(0, returnHistory.length - 13)].totalValue : 0;
    const absoluteGrowth = currentValue - earliestValue;
    const annualRate = earliestValue > 0 ? (absoluteGrowth / earliestValue) * 100 : 0;

    return {
      dataQuality: 'sufficient',
      consistencyScore,
      monthsInvested: monthsWithBuys.size,
      monthlyActivity: monthlyActivityArr,
      diversificationTrend: {
        current: Math.round(currentHHI),
        sixMonthsAgo: Math.round(sixMonthsAgoHHI),
        improving: currentHHI < sixMonthsAgoHHI, // lower HHI = more diversified
      },
      turnoverRate: {
        rate: Math.round(turnoverRate * 10) / 10,
        level: turnoverLevel,
      },
      wealthVelocity: {
        annualRate: Math.round(annualRate * 100) / 100,
        absoluteGrowth: Math.round(absoluteGrowth),
      },
    };
  }

  private computeHHIFromByType(byType: Record<string, { value: number; cost: number }>): number {
    const total = Object.values(byType).reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return 10000;
    return Object.values(byType).reduce((sum, d) => {
      const pct = (d.value / total) * 100;
      return sum + pct * pct;
    }, 0);
  }

  // ═══════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════

  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  }

  private formatKRW(value: number): string {
    if (value >= 100000000) return `${Math.round(value / 100000000)}억원`;
    if (value >= 10000) return `${Math.round(value / 10000)}만원`;
    return `${Math.round(value).toLocaleString()}원`;
  }
}
