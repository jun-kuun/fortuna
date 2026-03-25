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
  DEPOSIT:        { quantityLabel: '',           avgCostPriceLabel: '원금',           currentPriceLabel: '현재 평가액',  hideQuantity: true,  transactionLabels: { BUY: '납입', SELL: '해지' } },
  GOLD:           { quantityLabel: '보유량(g)',  avgCostPriceLabel: '매입 단가',      currentPriceLabel: '현재 시세',    hideQuantity: false, transactionLabels: { BUY: '매수', SELL: '매도' } },
  OTHER:          { quantityLabel: '수량',       avgCostPriceLabel: '매입 단가',      currentPriceLabel: '현재가',       hideQuantity: false, transactionLabels: { BUY: '매수', SELL: '매도' } },
};

// 부동산 서브타입 설정
export const REAL_ESTATE_SUB_TYPES = [
  { value: 'JEONSE',       label: '전세',       transactionLabels: { BUY: '납부', SELL: '반환' }, hideQuantity: true },
  { value: 'PURCHASE',     label: '매매',       transactionLabels: { BUY: '매입', SELL: '매각' }, hideQuantity: true },
  { value: 'MONTHLY_RENT', label: '월세 보증금', transactionLabels: { BUY: '납부', SELL: '반환' }, hideQuantity: true },
] as const;

export const REAL_ESTATE_SUB_TYPE_MAP: Record<string, typeof REAL_ESTATE_SUB_TYPES[number]> = Object.fromEntries(
  REAL_ESTATE_SUB_TYPES.map((s) => [s.value, s]),
);

// 예적금 서브타입 설정
export const DEPOSIT_SUB_TYPES = [
  { value: 'SAVINGS',  label: '적금', transactionLabels: { BUY: '납입', SELL: '해지' }, hideQuantity: true },
  { value: 'FIXED',    label: '예금', transactionLabels: { BUY: '가입', SELL: '해지' }, hideQuantity: true },
] as const;

export const DEPOSIT_SUB_TYPE_MAP: Record<string, typeof DEPOSIT_SUB_TYPES[number]> = Object.fromEntries(
  DEPOSIT_SUB_TYPES.map((s) => [s.value, s]),
);

export const ASSET_TYPE_BG_COLORS: Record<string, string> = {
  KOREAN_STOCK: 'bg-blue-100 text-blue-700',
  OVERSEAS_STOCK: 'bg-emerald-100 text-emerald-700',
  REAL_ESTATE: 'bg-amber-100 text-amber-700',
  DEPOSIT: 'bg-violet-100 text-violet-700',
  GOLD: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

export function getReturnBgColor(value: number): string {
  if (value > 0) return 'bg-red-50 text-red-600';
  if (value < 0) return 'bg-blue-50 text-blue-600';
  return 'bg-gray-50 text-gray-500';
}

export function formatDate(dateString: string): string {
  const d = new Date(dateString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export const ASSET_TYPE_COLORS: Record<string, string> = {
  KOREAN_STOCK: '#3b82f6',
  OVERSEAS_STOCK: '#10b981',
  REAL_ESTATE: '#f59e0b',
  DEPOSIT: '#8b5cf6',
  GOLD: '#f97316',
  OTHER: '#6b7280',
};
