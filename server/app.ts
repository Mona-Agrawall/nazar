import 'dotenv/config';
import express, { Request } from 'express';
import { Watchlist } from '../src/types.js';
import { AuthenticatedRequest, requireAuth } from './middleware/auth.js';
import { supabaseRepository } from './db/supabaseRepository.js';
import * as market from './services/marketService.js';
import { buildExplanation } from './services/narrativeService.js';
import {
  UserSession,
  applyDemoScenario,
  applyTimeTravel,
  getOrCreateSession,
  syncSession,
} from './services/sessionStore.js';
import { formatDuration } from './utils/formatDuration.js';

const MAX_WATCHLIST_NAME_LENGTH = 50;

const app = express();
app.use(express.json());

// Fire-and-forget so serverless cold starts are not delayed.
supabaseRepository.ensureStocksSeeded().catch(console.error);

/** The in-memory session for the requesting browser tab. */
function sessionFor(req: Request): UserSession {
  return getOrCreateSession(req.headers['x-session-id'] as string | undefined);
}

/** The watchlist named by ?watchlistId=, falling back to the active (or first) one. */
async function resolveWatchlist(req: AuthenticatedRequest, session: UserSession): Promise<Watchlist | undefined> {
  const requestedId = req.query.watchlistId as string | undefined;
  if (req.token) {
    const { watchlists, activeId } = await supabaseRepository.getWatchlists(req.token);
    return watchlists.find((w) => w.id === (requestedId || activeId)) || watchlists[0];
  }
  return session.watchlists.find((w) => w.id === (requestedId || session.activeWatchlistId)) || session.watchlists[0];
}

function onlyStrings(values: unknown[]): string[] {
  return values.filter((v): v is string => typeof v === 'string');
}

// ── Health & market overview ────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    provider: process.env.MARKET_DATA_PROVIDER || 'mock',
    gemini: process.env.GEMINI_API_KEY ? 'available' : 'unavailable (fallback active)',
  });
});

app.get('/api/market/indices', (_req, res) => {
  res.json({ success: true, data: market.getIndices() });
});

app.get('/api/market/status', (_req, res) => {
  res.json({ success: true, data: market.getFeedStatus() });
});

// ── Watchlists (Supabase when signed in, in-memory session in demo mode) ───

app.get('/api/watchlists', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.token) {
      const { watchlists, activeId } = await supabaseRepository.getWatchlists(req.token);
      return res.json({ success: true, data: watchlists, activeId });
    }
    const session = sessionFor(req);
    res.json({ success: true, data: session.watchlists, activeId: session.activeWatchlistId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/watchlists', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { name, symbols } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Watchlist name required' });
  }
  const trimmedName = name.trim().slice(0, MAX_WATCHLIST_NAME_LENGTH);
  try {
    if (req.token) {
      const data = await supabaseRepository.createWatchlist(req.token, trimmedName, symbols || []);
      return res.json({ success: true, data });
    }
    const session = sessionFor(req);
    const watchlist: Watchlist = {
      id: `wl_${Date.now()}`,
      name: trimmedName,
      symbols: Array.isArray(symbols) ? onlyStrings(symbols) : ['RELIANCE', 'TCS'],
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    session.watchlists.push(watchlist);
    session.activeWatchlistId = watchlist.id;
    res.json({ success: true, data: watchlist });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/watchlists/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, symbols, setActive } = req.body;
  try {
    if (req.token) {
      const data = await supabaseRepository.updateWatchlist(req.token, id, name, symbols, setActive);
      return res.json({ success: true, data });
    }
    const session = sessionFor(req);
    const watchlist = session.watchlists.find((w) => w.id === id);
    if (!watchlist) return res.status(404).json({ error: 'Watchlist not found' });
    if (name && typeof name === 'string') watchlist.name = name.trim().slice(0, MAX_WATCHLIST_NAME_LENGTH);
    if (Array.isArray(symbols)) watchlist.symbols = onlyStrings(symbols);
    watchlist.updatedAt = Date.now();
    if (setActive) session.activeWatchlistId = id;
    res.json({ success: true, data: watchlist });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/watchlists/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    if (req.token) {
      const activeId = await supabaseRepository.deleteWatchlist(req.token, id);
      return res.json({ success: true, activeId });
    }
    const session = sessionFor(req);
    const target = session.watchlists.find((w) => w.id === id);
    if (!target) return res.status(404).json({ error: 'Watchlist not found' });
    // Same rules as the Supabase path: the default (and therefore the last) watchlist stays.
    if (target.isDefault) {
      return res.status(400).json({ error: 'Cannot delete the default watchlist' });
    }
    if (session.watchlists.length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only watchlist' });
    }
    session.watchlists = session.watchlists.filter((w) => w.id !== id);
    if (session.activeWatchlistId === id) {
      session.activeWatchlistId = session.watchlists[0].id;
    }
    res.json({ success: true, activeId: session.activeWatchlistId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Stocks, summary and events for the active watchlist ─────────────────────

app.get('/api/market/stocks', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const session = sessionFor(req);
    const watchlist = await resolveWatchlist(req, session);
    const stocks = await market.getStocks(session, watchlist?.symbols ?? []);
    res.json({ success: true, data: stocks, watchlist });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/market/pulse', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const session = sessionFor(req);
    const watchlist = await resolveWatchlist(req, session);
    res.json({ success: true, data: await market.getMarketPulse(session, watchlist?.symbols ?? []) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/market/events', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const session = sessionFor(req);
    const watchlist = await resolveWatchlist(req, session);
    res.json({ success: true, data: market.getEvents(session, watchlist?.symbols ?? []) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/market/events/:id/acknowledge', (req, res) => {
  sessionFor(req).acknowledgedEventIds.add(req.params.id);
  res.json({ success: true, acknowledged: true, id: req.params.id });
});

app.post('/api/market/events/:id/dismiss', (req, res) => {
  sessionFor(req).dismissedEventIds.add(req.params.id);
  res.json({ success: true, dismissed: true, id: req.params.id });
});

// ── Stock lookup ────────────────────────────────────────────────────────────

app.get('/api/market/stocks/all', async (_req, res) => {
  try {
    res.json({ success: true, data: await market.getStocks(getOrCreateSession()) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/market/search', async (req, res) => {
  try {
    res.json({ success: true, data: await market.searchStocks((req.query.q as string) || '') });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/market/stocks/:symbol', async (req, res) => {
  try {
    const detail = await market.getStockDetail(sessionFor(req), req.params.symbol.toUpperCase());
    if (!detail) return res.status(404).json({ error: 'Stock not found' });
    res.json({ success: true, data: detail });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── "Why it matters" explanation ────────────────────────────────────────────

app.post('/api/explain', (req, res) => {
  const facts = req.body?.facts;
  if (!facts || !facts.symbol) {
    return res.status(400).json({ error: 'facts.symbol required' });
  }
  res.json({ success: true, narrative: buildExplanation(facts) });
});

// ── Session simulation (time away, mark as read, demo reset) ────────────────

app.post('/api/session/time-travel', (req, res) => {
  const session = sessionFor(req);
  const awaySeconds = applyTimeTravel(session, req.body.preset, req.body.awaySeconds);
  res.json({
    success: true,
    simulatedAwaySeconds: awaySeconds,
    lastVisitTimestamp: session.lastVisitTimestamp,
    awayFormatted: formatDuration(awaySeconds),
  });
});

app.post('/api/session/sync', (req, res) => {
  syncSession(sessionFor(req));
  res.json({ success: true, timestamp: Date.now() });
});

app.post('/api/demo/reset', (req, res) => {
  const session = sessionFor(req);
  applyDemoScenario(session);
  res.json({
    success: true,
    message: 'Demo reset to canonical "7h 42m away" scenario',
    awayFormatted: formatDuration(session.simulatedAwaySeconds),
  });
});

export default app;
