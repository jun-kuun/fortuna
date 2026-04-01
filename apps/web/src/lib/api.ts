import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Asset {
  id: string;
  name: string;
  type: string;
  subType?: string | null;
  currency: string;
  ticker?: string | null;
  interestRate?: number | null;
  maturityDate?: string | null;
  createdAt: string;
  holding?: Holding;
}

export interface Holding {
  id: string;
  assetId: string;
  quantity: number;
  avgCostPrice: number;
  currentPrice: number;
  priceChange?: number | null;
  priceChangePercent?: number | null;
  priceUpdatedAt?: string | null;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  assetId: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  fee: number;
  date: string;
  memo?: string;
  asset?: Asset;
  createdAt: string;
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
  type: string;
  value: number;
  percentage: number;
}

// Assets
export const assetsApi = {
  getAll: () => api.get<Asset[]>('/assets').then((r) => r.data),
  getOne: (id: string) => api.get<Asset>(`/assets/${id}`).then((r) => r.data),
  create: (data: { name: string; type: string; currency: string; ticker?: string; subType?: string; interestRate?: number; maturityDate?: string }) =>
    api.post<Asset>('/assets', data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; type: string; currency: string; ticker?: string; subType?: string; interestRate?: number; maturityDate?: string }>) =>
    api.patch<Asset>(`/assets/${id}`, data).then((r) => r.data),
  updateHolding: (id: string, data: { quantity?: number; avgCostPrice?: number; currentPrice?: number }) =>
    api.patch<Holding>(`/assets/${id}/holding`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/assets/${id}`).then((r) => r.data),
  restore: (id: string) => api.post(`/assets/${id}/restore`).then((r) => r.data),
};

// Portfolio
export const portfolioApi = {
  getSummary: () => api.get<PortfolioSummary>('/portfolio/summary').then((r) => r.data),
  getAllocation: () => api.get<AssetAllocation[]>('/portfolio/allocation').then((r) => r.data),
};

// Transactions
export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const transactionsApi = {
  getAll: (assetId?: string, page = 1, limit = 20) =>
    api.get<PaginatedTransactions>('/transactions', { params: { ...(assetId ? { assetId } : {}), page, limit } }).then((r) => r.data),
  create: (data: {
    assetId: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    fee: number;
    date: string;
    memo?: string;
  }) => api.post<Transaction>('/transactions', data).then((r) => r.data),
  delete: (id: string) => api.delete(`/transactions/${id}`).then((r) => r.data),
};

// Strategy
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

export const strategyApi = {
  getTemplates: () =>
    api.get<StrategyTemplate[]>('/strategy/templates').then((r) => r.data),
  getProfiles: () =>
    api.get<StrategyProfile[]>('/strategy/profiles').then((r) => r.data),
  createProfile: (data: { name: string; allocations: Record<string, number> }) =>
    api.post<StrategyProfile>('/strategy/profiles', data).then((r) => r.data),
  updateProfile: (id: string, data: { name?: string; allocations?: Record<string, number> }) =>
    api.patch<StrategyProfile>(`/strategy/profiles/${id}`, data).then((r) => r.data),
  deleteProfile: (id: string) =>
    api.delete(`/strategy/profiles/${id}`).then((r) => r.data),
  rebalance: (allocations: Record<string, number>) =>
    api.post<RebalanceResult[]>('/strategy/rebalance', { allocations }).then((r) => r.data),
  getReturnHistory: (period: 'monthly' | 'quarterly' = 'monthly') =>
    api.get<ReturnHistoryPoint[]>('/strategy/return-history', { params: { period } }).then((r) => r.data),
  getGoals: () =>
    api.get<InvestmentGoal[]>('/strategy/goals').then((r) => r.data),
  createGoal: (data: { name: string; targetAmount: number; targetDate: string }) =>
    api.post<InvestmentGoal>('/strategy/goals', data).then((r) => r.data),
  deleteGoal: (id: string) =>
    api.delete(`/strategy/goals/${id}`).then((r) => r.data),
  getGoalProjection: (id: string) =>
    api.get<GoalProjection>(`/strategy/goals/${id}/projection`).then((r) => r.data),
};

// Insights
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
  recommendations: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    title: string;
    description: string;
    impact: string;
  }>;
  generatedAt: string;
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
  holdingPeriods: Array<{ assetId: string; name: string; type: string; avgDays: number; status: 'short' | 'medium' | 'long' }>;
  buyHighSellLow: Array<{ assetId: string; name: string; type: string; buyScore: number; sellScore: number; verdict: 'good' | 'caution' | 'bad' }>;
  dcaAnalysis: { overallScore: number; perAsset: Array<{ assetId: string; name: string; regularity: number; avgIntervalDays: number; buyCount: number }> };
  emotionalTrading: { flags: Array<{ period: string; type: 'panic_sell' | 'fomo_buy'; transactionCount: number; description: string }> };
}

export interface FinancialHabits {
  dataQuality: 'sufficient' | 'insufficient';
  consistencyScore: number;
  monthsInvested: number;
  monthlyActivity: Array<{ month: string; buyCount: number; sellCount: number; netInflow: number }>;
  diversificationTrend: { current: number; sixMonthsAgo: number; improving: boolean };
  turnoverRate: { rate: number; level: 'patient' | 'moderate' | 'active' | 'unknown' };
  wealthVelocity: { annualRate: number; absoluteGrowth: number };
}

// Prices
export interface PriceUpdateResult {
  updatedCount: number;
  failedCount: number;
  skippedCount: number;
  exchangeRate: { USDKRW: number | null };
  results: Array<{
    assetId: string;
    assetName: string;
    ticker: string;
    oldPrice: number;
    newPrice: number;
    status: 'updated' | 'failed' | 'skipped';
    error?: string;
  }>;
  updatedAt: string;
}

export interface PriceHistoryItem {
  id: string;
  assetId: string;
  price: number;
  recordedAt: string;
}

export const priceApi = {
  updateAll: () => api.post<PriceUpdateResult>('/prices/update-all').then((r) => r.data),
  updateOne: (assetId: string) => api.post(`/prices/update/${assetId}`).then((r) => r.data),
  getHistory: (assetId: string, days = 30) =>
    api.get<PriceHistoryItem[]>(`/prices/history/${assetId}`, { params: { days } }).then((r) => r.data),
  getExchangeRate: () =>
    api.get<{ USDKRW: number | null; fetchedAt: string }>('/prices/exchange-rate').then((r) => r.data),
};

// News
export interface NewsItem {
  title: string;
  description: string;
  link: string;
  source: string;
  pubDate: string;
  category: 'market' | 'asset';
  relatedAsset?: string;
}

export interface AllNewsResponse {
  market: NewsItem[];
  assets: NewsItem[];
}

export const newsApi = {
  getAll: () => api.get<AllNewsResponse>('/news').then((r) => r.data),
  getMarket: () => api.get<NewsItem[]>('/news/market').then((r) => r.data),
  getAssetNews: (assetId?: string) =>
    api.get<NewsItem[]>('/news/assets', { params: assetId ? { assetId } : {} }).then((r) => r.data),
};

export const insightsApi = {
  getHealthCheck: () =>
    api.get<HealthCheckResult>('/insights/health-check').then((r) => r.data),
  getMonthlyReport: (month?: string) =>
    api.get<MonthlyReport>('/insights/monthly-report', { params: month ? { month } : {} }).then((r) => r.data),
  getTimingAnalysis: () =>
    api.get<TimingAnalysis>('/insights/timing-analysis').then((r) => r.data),
  getHabits: () =>
    api.get<FinancialHabits>('/insights/habits').then((r) => r.data),
};

export default api;
