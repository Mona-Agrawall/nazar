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

/** Sessions idle for longer than this are discarded. */
const SESSION_TTL_MS = 6 * 3600 * 1000;
/** Hard cap; the least recently used session is evicted beyond it. */
const MAX_SESSIONS = 5000;
const MAX_SESSION_ID_LENGTH = 64;
const SWEEP_INTERVAL_MS = 60 * 1000;

// Map iteration order doubles as LRU order: an accessed session is re-inserted at the end.
const sessions = new Map<string, { session: UserSession; lastAccessedAt: number }>();
let lastSweepAt = 0;

function sweepExpiredSessions(now: number) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  for (const [key, entry] of sessions) {
    if (now - entry.lastAccessedAt > SESSION_TTL_MS) sessions.delete(key);
  }
}

/** Number of live sessions (used by tests). */
export function getSessionCount(): number {
  return sessions.size;
}

/** Returns the session for a browser tab (X-Session-Id header), creating it on first use. */
export function getOrCreateSession(sessionId?: string | null): UserSession {
  const key = sessionId?.trim().slice(0, MAX_SESSION_ID_LENGTH) || 'default';
  const now = Date.now();
  sweepExpiredSessions(now);

  const existing = sessions.get(key);
  if (existing && now - existing.lastAccessedAt <= SESSION_TTL_MS) {
    sessions.delete(key);
    sessions.set(key, { session: existing.session, lastAccessedAt: now });
    return existing.session;
  }

  const session: UserSession = {
    lastVisitTimestamp: 0,
    simulatedAwaySeconds: 0,
    dismissedEventIds: new Set(),
    acknowledgedEventIds: new Set(),
    stockSnapshots: {},
    watchlists: createDemoWatchlists(),
    activeWatchlistId: 'wl_default',
  };
  applyDemoScenario(session);
  sessions.delete(key);
  sessions.set(key, { session, lastAccessedAt: now });
  while (sessions.size > MAX_SESSIONS) {
    sessions.delete(sessions.keys().next().value as string);
  }
  return session;
}

/**
 * Where prices were when the user last checked, and when that was. Kept in the in-memory session in demo
 * mode and in Supabase (user_visit_state) for signed-in users.
 */
export interface Baseline {
  lastVisitTimestamp: number;
  /** Last-seen price per symbol. */
  prices: Record<string, number>;
}

/** The canonical "away 7h 42m" demo baseline: last-seen prices are yesterday's closes. */
export function demoBaseline(now = Date.now()): Baseline {
  return {
    lastVisitTimestamp: now - DEMO_AWAY_SECONDS * 1000,
    prices: Object.fromEntries(BASE_STOCKS.map((s) => [s.symbol, s.yesterdayClose])),
  };
}

/** A baseline as if the user had been away for a preset (or custom) duration. */
export function timeTravelBaseline(
  preset?: string,
  awaySeconds?: unknown,
  now = Date.now(),
): { baseline: Baseline; awaySeconds: number } {
  let targetSeconds = DEMO_AWAY_SECONDS;
  const presetSeconds = preset ? TIME_TRAVEL_PRESETS.get(preset) : undefined;
  if (presetSeconds !== undefined) targetSeconds = presetSeconds;
  else if (typeof awaySeconds === 'number' && awaySeconds >= 0) targetSeconds = awaySeconds;

  // Rewind last-seen prices to before the demo moves happened (HDFCBANK was higher before its reversal).
  const factor = targetSeconds >= 24 * 3600 ? 0.93 : 0.97;
  const prices = Object.fromEntries(
    BASE_STOCKS.map((s) => {
      const multiplier = s.symbol === 'HDFCBANK' ? 1.027 : factor;
      return [s.symbol, Number((s.yesterdayClose * multiplier).toFixed(2))];
    }),
  );
  return { baseline: { lastVisitTimestamp: now - targetSeconds * 1000, prices }, awaySeconds: targetSeconds };
}

/** "Everything seen": current prices become the baseline. */
export function currentBaseline(now = Date.now()): Baseline {
  return { lastVisitTimestamp: now, prices: Object.fromEntries(BASE_STOCKS.map((s) => [s.symbol, s.basePrice])) };
}

/** The session fields derived from a baseline (away time is the real time since the last visit). */
function baselineFields(baseline: Baseline, now = Date.now()) {
  return {
    lastVisitTimestamp: baseline.lastVisitTimestamp,
    simulatedAwaySeconds: Math.max(0, Math.round((now - baseline.lastVisitTimestamp) / 1000)),
    stockSnapshots: Object.fromEntries(
      Object.entries(baseline.prices).map(([symbol, price]) => [
        symbol,
        { price, timestamp: baseline.lastVisitTimestamp },
      ]),
    ),
  };
}

/** A copy of the session that uses the given baseline (event acknowledgements stay shared with the session). */
export function withBaseline(session: UserSession, baseline: Baseline, now = Date.now()): UserSession {
  return { ...session, ...baselineFields(baseline, now) };
}

function applyBaseline(session: UserSession, baseline: Baseline) {
  Object.assign(session, baselineFields(baseline));
}

/** Restores the canonical "7h 42m away" scenario: last-seen prices are yesterday's closes. */
export function applyDemoScenario(session: UserSession) {
  applyBaseline(session, demoBaseline());
  session.dismissedEventIds.clear();
  session.acknowledgedEventIds.clear();
}

/** Simulates the user having been away for a preset (or custom) duration. Returns the seconds applied. */
export function applyTimeTravel(session: UserSession, preset?: string, awaySeconds?: unknown): number {
  const result = timeTravelBaseline(preset, awaySeconds);
  applyBaseline(session, result.baseline);
  return result.awaySeconds;
}

/** Marks everything as seen: current prices become the new baseline. */
export function syncSession(session: UserSession) {
  applyBaseline(session, currentBaseline());
}
