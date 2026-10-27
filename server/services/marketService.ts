import {
  FeedStatus,
  MarketEvent,
  MarketIndex,
  MarketPulse,
  PricePoint,
  Stock,
  StockDetailExtended,
} from '../../src/types.js';
import { BASE_STOCKS } from '../data/stockUniverse.js';
import { EVENT_TEMPLATES, MARKET_INDICES } from '../data/demoScenario.js';
import { HistoricalData } from '../providers/types.js';
import { MockMarketDataProvider } from '../providers/MockMarketDataProvider.js';
import { TwelveDataProvider } from '../providers/TwelveDataProvider.js';
import { formatDuration } from '../utils/formatDuration.js';
import { calculateAttention } from './attentionEngine.js';
import { buildStockNarrative } from './narrativeService.js';
import { UserSession, getOrCreateSession } from './sessionStore.js';

const isLiveProvider = process.env.MARKET_DATA_PROVIDER === 'twelve_data';
const mockProvider = new MockMarketDataProvider();
const searchProvider = isLiveProvider ? new TwelveDataProvider() : mockProvider;

/** Builds a smooth 24-point sparkline from the last-seen price to the current price. */
function generateSparkline(start: number, end: number, points = 24, volatility = 0.008): number[] {
  const result: number[] = [start];
  const step = (end - start) / (points - 1);
  for (let i = 1; i < points - 1; i++) {
    const noise = (Math.sin(i * 0.9) * 0.5 + Math.cos(i * 1.7) * 0.5) * (start * volatility);
    result.push(Number((start + step * i + noise).toFixed(2)));
  }
  result.push(Number(end.toFixed(2)));
  return result;
}

function toPricePoints(history: HistoricalData): PricePoint[] {
  return history.data.map((d) => ({
    timestamp: new Date(d.datetime).getTime(),
    price: d.close,
    volume: d.volume,
  }));
}

export function getIndices(): MarketIndex[] {
  return MARKET_INDICES;
}

/**
 * Returns stocks enriched with attention scores and the change since the user's last visit.
 * Omitting `symbols` returns the whole universe; an empty array returns no stocks.
 */
export async function getStocks(session: UserSession, symbols?: string[]): Promise<Stock[]> {
  const list = symbols ? BASE_STOCKS.filter((s) => symbols.includes(s.symbol)) : BASE_STOCKS;

  return Promise.all(
    list.map(async (s) => {
      const currentPrice = s.basePrice;
      const yesterdayClose = s.yesterdayClose;
      const change24h = currentPrice - yesterdayClose;
      const changePercent24h = (change24h / yesterdayClose) * 100;

      // Demo volumes: the three headline stocks trade well above their average.
      let volume = Math.round(s.avgVolume30d * 1.1);
      if (s.symbol === 'RELIANCE') volume = Math.round(s.avgVolume30d * 2.4);
      if (s.symbol === 'HDFCBANK') volume = Math.round(s.avgVolume30d * 1.8);
      if (s.symbol === 'TCS') volume = Math.round(s.avgVolume30d * 1.6);
      const volumeRatio = volume / s.avgVolume30d;

      const openPrice = s.symbol === 'HDFCBANK' ? 1695.0 : s.symbol === 'RELIANCE' ? 2360.0 : yesterdayClose * 1.002;
      const dayHigh = Math.max(currentPrice, openPrice, s.high30d * 0.998);
      const dayLow = Math.min(currentPrice, openPrice, yesterdayClose * 0.99);

      const previousPrice = session.stockSnapshots[s.symbol]?.price ?? yesterdayClose;
      const priceDiff = currentPrice - previousPrice;
      const percentDiff = (priceDiff / previousPrice) * 100;
      const awayStr = formatDuration(session.simulatedAwaySeconds);

      const attention = calculateAttention(s, currentPrice, volume, openPrice, previousPrice, awayStr);
      const narrative = await buildStockNarrative({
        symbol: s.symbol,
        currentPrice,
        previousPrice,
        volumeRatio,
        high30d: s.high30d,
        awayDurationStr: awayStr,
        attentionLevel: attention.level,
        factors: attention.factors,
      });

      return {
        symbol: s.symbol,
        name: s.name,
        exchange: s.exchange,
        sector: s.sector,
        currentPrice,
        yesterdayClose,
        openPrice,
        dayHigh,
        dayLow,
        change24h: Number(change24h.toFixed(2)),
        changePercent24h: Number(changePercent24h.toFixed(2)),
        volume,
        avgVolume30d: s.avgVolume30d,
        volumeRatio: Number(volumeRatio.toFixed(1)),
        high52w: s.high52w,
        low52w: s.low52w,
        high30d: s.high30d,
        low30d: s.low30d,
        volatilityPercent: s.volatilityPercent,
        marketCap: s.marketCap,
        sparkline: generateSparkline(previousPrice, currentPrice, 24, s.volatilityPercent / 100),
        attentionScore: attention.score,
        attentionLevel: attention.level,
        scoreFactors: attention.factors,
        tags: s.tags,
        userDelta: {
          previousPrice,
          currentPrice,
          priceDiff: Number(priceDiff.toFixed(2)),
          percentDiff: Number(percentDiff.toFixed(2)),
          lastSeenTimeFormatted: awayStr,
          narrative,
        },
      };
    }),
  );
}

/** A single stock plus chart history for every timeframe and its recent events. */
export async function getStockDetail(session: UserSession, symbol: string): Promise<StockDetailExtended | null> {
  const [stock] = await getStocks(session, [symbol]);
  if (!stock) return null;

  // Charts always use generated history so switching timeframes is instant and costs no API credits.
  const [h1D, h1W, h1M, h1Y] = await Promise.all([
    mockProvider.getHistoricalData(symbol, '1D'),
    mockProvider.getHistoricalData(symbol, '1W'),
    mockProvider.getHistoricalData(symbol, '1M'),
    mockProvider.getHistoricalData(symbol, '1Y'),
  ]);

  return {
    ...stock,
    chartData: {
      '1D': toPricePoints(h1D),
      '1W': toPricePoints(h1W),
      '1M': toPricePoints(h1M),
      '1Y': toPricePoints(h1Y),
      ALL: toPricePoints(h1Y),
    },
    events: getEvents(session, [symbol]),
  };
}

/** Timeline events during the user's absence (never in the future), newest first. */
export function getEvents(session: UserSession, symbols?: string[]): MarketEvent[] {
  const startOfAway = Date.now() - session.simulatedAwaySeconds * 1000;

  return EVENT_TEMPLATES.filter((e) => !symbols || symbols.includes(e.stockSymbol))
    .filter((e) => e.offsetSeconds <= session.simulatedAwaySeconds)
    .map(({ offsetSeconds, ...event }) => ({
      ...event,
      timestamp: startOfAway + offsetSeconds * 1000,
      // Event stocks trade on NSE, so times are shown in IST regardless of the server's timezone.
      timeFormatted: new Date(startOfAway + offsetSeconds * 1000).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      }),
      dismissed: session.dismissedEventIds.has(event.id),
      acknowledged: session.acknowledgedEventIds.has(event.id),
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

/** The "You were away for 7h 42m, 3 things changed meaningfully" summary. */
export async function getMarketPulse(session: UserSession, watchlistSymbols: string[]): Promise<MarketPulse> {
  const stocks = await getStocks(session, watchlistSymbols);
  const events = getEvents(session, watchlistSymbols).filter((e) => !e.dismissed);
  const awayFormatted = formatDuration(session.simulatedAwaySeconds);

  const meaningfulStocks = stocks
    .filter((s) => s.attentionScore >= 65)
    .sort((a, b) => b.attentionScore - a.attentionScore);
  const meaningfulCount = meaningfulStocks.length;
  const highlights = meaningfulStocks
    .slice(0, 3)
    .map((s) => `${s.symbol} ${s.userDelta.percentDiff >= 0 ? '+' : ''}${s.userDelta.percentDiff.toFixed(1)}%`);
  const avgChange = stocks.reduce((sum, s) => sum + s.userDelta.percentDiff, 0) / (stocks.length || 1);

  return {
    awayDurationFormatted: awayFormatted,
    awayDurationSeconds: session.simulatedAwaySeconds,
    lastVisitTimestamp: session.lastVisitTimestamp,
    currentTimestamp: Date.now(),
    totalChangesCount: stocks.length,
    meaningfulChangesCount: meaningfulCount,
    positiveCount: stocks.filter((s) => s.userDelta.percentDiff >= 1.2).length,
    negativeCount: stocks.filter((s) => s.userDelta.percentDiff <= -1.2).length,
    eventsCount: events.length,
    overallWatchlistChange: Number(avgChange.toFixed(2)),
    topHighlights: events.slice(0, 4),
    narrativeSummary:
      meaningfulCount === 0
        ? `You were away for ${awayFormatted}. Nothing in your watchlist changed meaningfully.`
        : `You were away for ${awayFormatted}. ${meaningfulCount} ${meaningfulCount === 1 ? 'thing' : 'things'} changed meaningfully across your watchlist: ${highlights.join(', ')}.`,
  };
}

/** Symbol/name search. Results use a neutral session so they are not affected by any tab's time travel. */
export async function searchStocks(query: string): Promise<Stock[]> {
  const searchSession = getOrCreateSession('__search__');
  if (!query.trim())
    return getStocks(
      searchSession,
      BASE_STOCKS.slice(0, 6).map((s) => s.symbol),
    );

  const results = await searchProvider.searchSymbols(query);
  const symbols = results.map((s) => s.symbol).slice(0, 10);
  if (symbols.length === 0) return [];
  return getStocks(searchSession, symbols);
}

/** Prices always come from the built-in dataset; only symbol search can use a live provider. */
export function getFeedStatus(): FeedStatus {
  return {
    mode: 'SIMULATED',
    label: 'Simulated data',
    detail: isLiveProvider
      ? 'Prices are a built-in demo dataset and do not update. Symbol search uses the Twelve Data API.'
      : 'Prices are a built-in demo dataset and do not update. Not real market data.',
    lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}
