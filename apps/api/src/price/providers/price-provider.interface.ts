export interface PriceResult {
  ticker: string;
  price: number;
  currency: string;
  fetchedAt: Date;
}

export interface PriceProvider {
  fetchPrice(ticker: string): Promise<PriceResult | null>;
}
