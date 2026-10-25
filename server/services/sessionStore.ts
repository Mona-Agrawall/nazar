import { Watchlist } from '../../src/types.js';
import { BASE_STOCKS } from '../data/stockUniverse.js';
import { DEMO_AWAY_SECONDS, createDemoWatchlists } from '../data/demoScenario.js';

/**
 * Per-browser-tab state used in demo mode and by the "time away" simulation.
 * Kept in memory only, so it resets whenever the server restarts.
 */
export interface UserSession {
  lastVisitTimestamp: number;
  simulatedAwaySeconds: number;
  dismissedEventIds: Set<string>;
  acknowledgedEventIds: Set<string>;
  /** Price of each stock when the user last checked, keyed by symbol. */
  stockSnapshots: Record<string, { price: number; timestamp: number }>;
  watchlists: Watchlist[];
  activeWatchlistId: string;
}

const TIME_TRAVEL_PRESETS = new Map<string, number>([
  ['15m', 15 * 60],
  ['2h', 2 * 3600],
  ['7h42m', DEMO_AWAY_SECONDS],
  ['24h', 24 * 3600],
  ['3d', 72 * 3600],
]);

const sessions = new Map<string, UserSession>();

/** Returns the session for a browser tab (X-Session-Id header), creating it on first use. */
export function getOrCreateSession(sessionId?: string | null): UserSession {
  const key = sessionId?.trim() || 'default';
  let session = sessions.get(key);
  if (!session) {
    session = {
      lastVisitTimestamp: 0,
      simulatedAwaySeconds: 0,
      dismissedEventIds: new Set(),
      acknowledgedEventIds: new Set(),
      stockSnapshots: {},
      watchlists: createDemoWatchlists(),
      activeWatchlistId: 'wl_default',
    };
    applyDemoScenario(session);
    sessions.set(key, session);
  }
  return session;
}

function setAwayDuration(session: UserSession, awaySeconds: number) {
  session.simulatedAwaySeconds = awaySeconds;
  session.lastVisitTimestamp = Date.now() - awaySeconds * 1000;
}

/** Restores the canonical "7h 42m away" scenario: last-seen prices are yesterday's closes. */
export function applyDemoScenario(session: UserSession) {
  setAwayDuration(session, DEMO_AWAY_SECONDS);
  session.dismissedEventIds.clear();
  session.acknowledgedEventIds.clear();
  BASE_STOCKS.forEach((s) => {
    session.stockSnapshots[s.symbol] = { price: s.yesterdayClose, timestamp: session.lastVisitTimestamp };
  });
}

/** Simulates the user having been away for a preset (or custom) duration. Returns the seconds applied. */
export function applyTimeTravel(session: UserSession, preset?: string, awaySeconds?: unknown): number {
  let targetSeconds = DEMO_AWAY_SECONDS;
  const presetSeconds = preset ? TIME_TRAVEL_PRESETS.get(preset) : undefined;
  if (presetSeconds !== undefined) targetSeconds = presetSeconds;
  else if (typeof awaySeconds === 'number' && awaySeconds >= 0) targetSeconds = awaySeconds;

  setAwayDuration(session, targetSeconds);

  // Rewind last-seen prices to before the demo moves happened (HDFCBANK was higher before its reversal).
  const factor = targetSeconds >= 24 * 3600 ? 0.93 : 0.97;
  BASE_STOCKS.forEach((s) => {
    const multiplier = s.symbol === 'HDFCBANK' ? 1.027 : factor;
    session.stockSnapshots[s.symbol] = {
      price: Number((s.yesterdayClose * multiplier).toFixed(2)),
      timestamp: session.lastVisitTimestamp,
    };
  });
  return targetSeconds;
}

/** Marks everything as seen: current prices become the new baseline. */
export function syncSession(session: UserSession) {
  setAwayDuration(session, 0);
  BASE_STOCKS.forEach((s) => {
    session.stockSnapshots[s.symbol] = { price: s.basePrice, timestamp: Date.now() };
  });
}
