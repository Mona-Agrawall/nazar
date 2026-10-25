import { MarketDataProvider, SearchResult } from './types.js';

/** Searches symbols through the Twelve Data API (the search endpoint needs no API key or credits). */
export class TwelveDataProvider implements MarketDataProvider {
  async searchSymbols(query: string): Promise<SearchResult[]> {
    try {
      const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&outputsize=5`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      if (Array.isArray(data.data)) {
        return data.data.map((item: any) => ({
          symbol: item.symbol,
          name: item.instrument_name || item.name,
          exchange: item.exchange,
          type: item.instrument_type,
        }));
      }
    } catch (e) {
      console.error('[Twelve Data] Search failed:', e);
    }
    return [];
  }
}
