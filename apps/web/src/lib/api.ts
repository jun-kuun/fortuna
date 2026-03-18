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
  currency: string;
  createdAt: string;
  holding?: Holding;
}

export interface Holding {
  id: string;
  assetId: string;
  quantity: number;
  avgCostPrice: number;
  currentPrice: number;
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
  create: (data: { name: string; type: string; currency: string }) =>
    api.post<Asset>('/assets', data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; type: string; currency: string }>) =>
    api.patch<Asset>(`/assets/${id}`, data).then((r) => r.data),
  updateHolding: (id: string, data: { quantity?: number; avgCostPrice?: number; currentPrice?: number }) =>
    api.patch<Holding>(`/assets/${id}/holding`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/assets/${id}`).then((r) => r.data),
};

// Portfolio
export const portfolioApi = {
  getSummary: () => api.get<PortfolioSummary>('/portfolio/summary').then((r) => r.data),
  getAllocation: () => api.get<AssetAllocation[]>('/portfolio/allocation').then((r) => r.data),
};

// Transactions
export const transactionsApi = {
  getAll: (assetId?: string) =>
    api.get<Transaction[]>('/transactions', { params: assetId ? { assetId } : {} }).then((r) => r.data),
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

export default api;
