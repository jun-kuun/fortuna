import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = 'KRW'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value);
}

export function getReturnColor(value: number): string {
  if (value > 0) return 'text-red-500';   // 한국식: 상승=빨간색
  if (value < 0) return 'text-blue-500';  // 한국식: 하락=파란색
  return 'text-gray-500';
}

export const ASSET_TYPE_LABELS: Record<string, string> = {
  KOREAN_STOCK: '국내 주식',
  OVERSEAS_STOCK: '해외 주식',
  REAL_ESTATE: '부동산',
  DEPOSIT: '예적금',
  GOLD: '금',
  OTHER: '기타',
};

/** 숫자 문자열에 천단위 쉼표 추가 (입력 필드용) */
export function toCommaString(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [integer, decimal] = cleaned.split('.');
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
}

/** 쉼표 제거하여 숫자 문자열로 변환 */
export function fromCommaString(value: string): string {
  return value.replace(/,/g, '');
}

export const ASSET_TYPE_FIELD_CONFIG: Record<string, {
  quantityLabel: string;
  avgCostPriceLabel: string;
  currentPriceLabel: string;
  hideQuantity: boolean;
  transactionLabels: { BUY: string; SELL: string };
}> = {
  KOREAN_STOCK:   { quantityLabel: '보유 수량',  avgCostPriceLabel: '평균 매수 단가', currentPriceLabel: '현재가',       hideQuantity: false, transactionLabels: { BUY: '매수', SELL: '매도' } },
  OVERSEAS_STOCK: { quantityLabel: '보유 수량',  avgCostPriceLabel: '평균 매수 단가', currentPriceLabel: '현재가',       hideQuantity: false, transactionLabels: { BUY: '매수', SELL: '매도' } },
  REAL_ESTATE:    { quantityLabel: '보유 수',    avgCostPriceLabel: '매입가',         currentPriceLabel: '현재 시세',    hideQuantity: false, transactionLabels: { BUY: '매입', SELL: '매각' } },
  DEPOSIT:        { quantityLabel: '',           avgCostPriceLabel: '원금',           currentPriceLabel: '현재 평가액',  hideQuantity: true,  transactionLabels: { BUY: '가입', SELL: '해지' } },
  GOLD:           { quantityLabel: '보유량(g)',  avgCostPriceLabel: '매입 단가(g)',   currentPriceLabel: '현재 시세(g)', hideQuantity: false, transactionLabels: { BUY: '매수', SELL: '매도' } },
  OTHER:          { quantityLabel: '수량',       avgCostPriceLabel: '매입 단가',      currentPriceLabel: '현재가',       hideQuantity: false, transactionLabels: { BUY: '매수', SELL: '매도' } },
};

export const ASSET_TYPE_COLORS: Record<string, string> = {
  KOREAN_STOCK: '#3b82f6',
  OVERSEAS_STOCK: '#10b981',
  REAL_ESTATE: '#f59e0b',
  DEPOSIT: '#8b5cf6',
  GOLD: '#f97316',
  OTHER: '#6b7280',
};
