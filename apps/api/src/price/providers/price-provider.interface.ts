export interface PriceResult {
  ticker: string;
  price: number;
  priceChange?: number;      // 전일 대비 변동액 (양수=상승, 음수=하락)
  priceChangePercent?: number; // 전일 대비 변동률 (%)
  currency: string;
  fetchedAt: Date;
}

export interface PriceProvider {
  fetchPrice(ticker: string): Promise<PriceResult | null>;
}
