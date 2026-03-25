export enum AssetType {
  KOREAN_STOCK = 'KOREAN_STOCK',
  OVERSEAS_STOCK = 'OVERSEAS_STOCK',
  REAL_ESTATE = 'REAL_ESTATE',
  DEPOSIT = 'DEPOSIT',
  GOLD = 'GOLD',
  OTHER = 'OTHER',
}

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum Currency {
  KRW = 'KRW',
  USD = 'USD',
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  currency: Currency;
  createdAt: Date;
  holding?: Holding;
}

export interface Holding {
  id: string;
  assetId: string;
  quantity: number;
  avgCostPrice: number;
  currentPrice: number;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  assetId: string;
  type: TransactionType;
  quantity: number;
  price: number;
  fee: number;
  date: Date;
  memo?: string;
  asset?: Asset;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  totalReturnRate: number;
  holdings: HoldingWithAsset[];
}

export interface HoldingWithAsset extends Holding {
  asset: Asset;
  currentValue: number;
  totalCost: number;
  returnAmount: number;
  returnRate: number;
}

export interface AssetAllocation {
  type: AssetType;
  value: number;
  percentage: number;
}

// API Request/Response types
export interface CreateAssetDto {
  name: string;
  type: AssetType;
  currency: Currency;
}

export interface UpdateAssetDto {
  name?: string;
  type?: AssetType;
  currency?: Currency;
}

export interface UpdateHoldingDto {
  quantity?: number;
  avgCostPrice?: number;
  currentPrice?: number;
}

export interface CreateTransactionDto {
  assetId: string;
  type: TransactionType;
  quantity: number;
  price: number;
  fee: number;
  date: string;
  memo?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ── Strategy Types ──

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  allocations: Record<string, number>;
}

export interface StrategyProfile {
  id: string;
  name: string;
  allocations: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface RebalanceResult {
  assetType: string;
  currentValue: number;
  currentPercent: number;
  targetValue: number;
  targetPercent: number;
  diff: number;
  action: 'BUY' | 'SELL' | 'HOLD';
}

export interface ReturnHistoryPoint {
  date: string;
  totalValue: number;
  totalCost: number;
  returnRate: number;
  byType: Record<string, { value: number; cost: number }>;
}

export interface InvestmentGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProjection {
  goalId: string;
  goalName: string;
  currentValue: number;
  targetAmount: number;
  targetDate: string;
  projectedFinalValue: number;
  cagr: number;
  onTrack: boolean;
  shortfall: number;
  monthlyProjections: Array<{ date: string; value: number }>;
}

// ── Insights Types ──

export interface HealthCheckResult {
  overallScore: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  dataQuality: 'sufficient' | 'insufficient';
  diversification: {
    score: number;
    grade: string;
    assetTypeCount: number;
    assetCount: number;
    hhi: number;
  };
  riskAssessment: {
    score: number;
    level: string;
    weightedRisk: number;
  };
  rebalancingUrgency: {
    level: string;
    totalDeviation: number;
    hasProfile: boolean;
    profileName?: string;
  };
  cashDrag: {
    level: string;
    score: number;
    depositPercent: number;
    opportunityCost: number;
    opportunityCost5yr: number;
    opportunityCost10yr: number;
  };
  recommendations: Recommendation[];
  generatedAt: string;
}

export interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  impact: string;
}

export interface MonthlyReport {
  month: string;
  dataQuality: 'sufficient' | 'insufficient';
  netWorth: number;
  previousNetWorth: number;
  change: number;
  changePercent: number;
  bestPerformers: Array<{ type: string; name: string; returnRate: number; returnAmount: number }>;
  worstPerformers: Array<{ type: string; name: string; returnRate: number; returnAmount: number }>;
  netInflow: number;
  milestones: string[];
  growthStreak: number;
  monthlyHistory: Array<{ month: string; netWorth: number; change: number }>;
}

export interface TimingAnalysis {
  dataQuality: 'sufficient' | 'insufficient';
  holdingPeriods: Array<{
    assetId: string;
    name: string;
    type: string;
    avgDays: number;
    status: 'short' | 'medium' | 'long';
  }>;
  buyHighSellLow: Array<{
    assetId: string;
    name: string;
    type: string;
    buyScore: number;
    sellScore: number;
    verdict: 'good' | 'caution' | 'bad';
  }>;
  dcaAnalysis: {
    overallScore: number;
    perAsset: Array<{
      assetId: string;
      name: string;
      regularity: number;
      avgIntervalDays: number;
      buyCount: number;
    }>;
  };
  emotionalTrading: {
    flags: Array<{
      period: string;
      type: 'panic_sell' | 'fomo_buy';
      transactionCount: number;
      description: string;
    }>;
  };
}

export interface FinancialHabits {
  dataQuality: 'sufficient' | 'insufficient';
  consistencyScore: number;
  monthsInvested: number;
  monthlyActivity: Array<{
    month: string;
    buyCount: number;
    sellCount: number;
    netInflow: number;
  }>;
  diversificationTrend: {
    current: number;
    sixMonthsAgo: number;
    improving: boolean;
  };
  turnoverRate: {
    rate: number;
    level: 'patient' | 'moderate' | 'active' | 'unknown';
  };
  wealthVelocity: {
    annualRate: number;
    absoluteGrowth: number;
  };
}
