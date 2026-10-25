/**
 * Market data provider abstraction. The active provider is chosen with MARKET_DATA_PROVIDER:
 * - "mock" (default) → MockMarketDataProvider, searches the built-in stock universe
 * - "twelve_data"    → TwelveDataProvider, uses the Twelve Data symbol-search API
 */
export interface MarketDataProvider {
  searchSymbols(query: string): Promise<SearchResult[]>;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export type HistoricalRange = '1D' | '1W' | '1M' | '1Y';

export interface HistoricalPoint {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalData {
  symbol: string;
  interval: string;
  data: HistoricalPoint[];
}
