import { HistoricalData, HistoricalRange, MarketDataProvider, SearchResult } from './types.js';
import { BASE_STOCKS } from '../data/stockUniverse.js';

/** Offline provider backed by the built-in stock universe. Also generates the chart history. */
export class MockMarketDataProvider implements MarketDataProvider {
  /** Deterministic (seeded by symbol + range) price history, so charts are identical on every call. */
  async getHistoricalData(symbol: string, range: HistoricalRange): Promise<HistoricalData> {
    const stock = BASE_STOCKS.find((s) => s.symbol === symbol);
    if (!stock) throw new Error(`Symbol not found: ${symbol}`);

    // Deterministic seeded random based on symbol+range — same data every call
    const seed =
      symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) +
      range.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const seededRand = (i: number): number => {
      const x = Math.sin(seed + i * 127.1) * 43758.5453;
      return x - Math.floor(x);
    };

    // Config per timeframe: how many candles, interval size, how much the price can drift
    const configs: Record<
      HistoricalRange,
      { points: number; intervalMs: number; intervalLabel: string; volatilityScale: number; startOffset: number }
    > = {
      '1D': {
        points: 30,
        intervalMs: 15 * 60 * 1000,
        intervalLabel: '15min',
        volatilityScale: 0.1,
        startOffset: 6.5 * 3600 * 1000,
      },
      '1W': {
        points: 35,
        intervalMs: 4 * 3600 * 1000,
        intervalLabel: '4h',
        volatilityScale: 0.4,
        startOffset: 7 * 24 * 3600 * 1000,
      },
      '1M': {
        points: 30,
        intervalMs: 24 * 3600 * 1000,
        intervalLabel: '1day',
        volatilityScale: 0.8,
        startOffset: 30 * 24 * 3600 * 1000,
      },
      '1Y': {
        points: 52,
        intervalMs: 7 * 24 * 3600 * 1000,
        intervalLabel: '1week',
        volatilityScale: 2.5,
        startOffset: 365 * 24 * 3600 * 1000,
      },
    };

    const { points, intervalMs, intervalLabel, volatilityScale, startOffset } = configs[range];

    // For longer timeframes, start from a lower base so the chart shows a meaningful journey
    const rangeBasePrice: Record<HistoricalRange, number> = {
      '1D': stock.yesterdayClose,
      '1W': stock.basePrice * 0.97, // ~3% below current
      '1M': stock.basePrice * 0.93, // ~7% below current
      '1Y': stock.low52w, // Start near 52-week low
    };

    let curTime = Date.now() - startOffset;
    let curPrice = rangeBasePrice[range];
    const targetPrice = stock.basePrice; // The price series trends toward current price

    const data = [];

    for (let i = 0; i < points; i++) {
      // Gentle mean-reversion drift toward target + seeded noise
      const progress = i / points;
      const drift = (targetPrice - curPrice) * 0.04 * progress;
      const noise = (seededRand(i) - 0.48) * stock.volatilityPercent * curPrice * volatilityScale * 0.01;
      curPrice = Math.max(stock.low52w * 0.85, curPrice + drift + noise);

      const open = Number((curPrice - (seededRand(i + 1000) - 0.5) * curPrice * 0.005).toFixed(2));
      const high = Number((Math.max(curPrice, open) + seededRand(i + 2000) * curPrice * 0.008).toFixed(2));
      const low = Number((Math.min(curPrice, open) - seededRand(i + 3000) * curPrice * 0.008).toFixed(2));
      const volume = Math.floor(stock.avgVolume30d * (0.5 + seededRand(i + 4000) * 1.0));

      data.push({
        datetime: new Date(curTime).toISOString(),
        open,
        high,
        low,
        close: Number(curPrice.toFixed(2)),
        volume,
      });
      curTime += intervalMs;
    }

    return { symbol, interval: intervalLabel, data };
  }

  async searchSymbols(query: string): Promise<SearchResult[]> {
    const q = query.toLowerCase().trim();
    // Matches symbol, company name, sector and tags (e.g. "Banking", "EV", "Tata Group").
    return BASE_STOCKS.filter((s) =>
      [s.symbol, s.name, s.sector, ...s.tags].some((field) => field.toLowerCase().includes(q)),
    ).map((s) => ({
      symbol: s.symbol,
      name: s.name,
      exchange: s.exchange,
      type: s.sector,
    }));
  }
}
