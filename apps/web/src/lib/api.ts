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

export default api;
