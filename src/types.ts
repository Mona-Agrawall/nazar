/** Top-level navigation tabs. */
export type AppTab = 'pulse' | 'watchlist' | 'timeline' | 'indices';

export type FeedStateMode = 'LIVE' | 'DELAYED' | 'STALE' | 'UNAVAILABLE';

export interface FeedStatus {
  mode: FeedStateMode;
  label: string;
  detail: string;
  lastUpdated: string;
}

export type Timeframe = '1D' | '1W' | '1M' | '1Y' | 'ALL';

export interface AttentionFactor {
  id: string;
  label: string;
  points: number;
  description: string;
  type: 'volume' | 'price' | 'breakout' | 'volatility' | 'gap' | 'news';
}

export interface UserStockDelta {
  previousPrice: number;
  currentPrice: number;
  priceDiff: number;
  percentDiff: number;
  lastSeenTimeFormatted: string;
  narrative: string;
}

export interface Stock {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE' | string;
  sector: string;
  currentPrice: number;
  yesterdayClose: number;
  openPrice: number;
  dayHigh: number;
  dayLow: number;
  change24h: number;
  changePercent24h: number;
  volume: number;
  avgVolume30d: number;
  volumeRatio: number;
  high52w: number;
  low52w: number;
  high30d: number;
  low30d: number;
  volatilityPercent: number;
  marketCap: string;
  sparkline: number[];
  attentionScore: number;
  attentionLevel: 'high' | 'medium' | 'low';
  scoreFactors: AttentionFactor[];
  userDelta: UserStockDelta;
  tags: string[];
}

export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  sparkline: number[];
  high: number;
  low: number;
}

export type EventChangeType =
  | 'price_up'
  | 'price_down'
  | 'volume_surge'
  | 'breakout_high'
  | 'breakdown_low'
  | 'volatility_spike'
  | 'range_recovery';

export interface MarketEvent {
  id: string;
  timestamp: number;
  timeFormatted: string;
  stockSymbol: string;
  stockName: string;
  title: string;
  change: string;
  changeType: EventChangeType;
  importance: 'critical' | 'high' | 'medium';
  explanation: string;
  miniChart: number[];
  dismissed: boolean;
  acknowledged: boolean;
}

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MarketPulse {
  awayDurationFormatted: string;
  awayDurationSeconds: number;
  lastVisitTimestamp: number;
  currentTimestamp: number;
  totalChangesCount: number;
  meaningfulChangesCount: number;
  positiveCount: number;
  negativeCount: number;
  eventsCount: number;
  overallWatchlistChange: number;
  topHighlights: MarketEvent[];
  narrativeSummary: string;
}

export interface PricePoint {
  time: string;
  price: number;
  volume: number;
}

export interface StockDetailExtended extends Stock {
  chartData: Record<Timeframe, PricePoint[]>;
  events: MarketEvent[];
}
