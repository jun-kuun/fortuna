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
