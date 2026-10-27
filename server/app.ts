import 'dotenv/config';
import express, { Request } from 'express';
import helmet from 'helmet';
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
import { MAX_AWAY_SECONDS, isValidId, parseName, parseSymbols, queryString } from './validation.js';

const app = express();
app.disable('x-powered-by');
app.use(
  helmet({
    // Vite's dev server injects inline scripts, so the CSP is only enforced for the production build.
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              // React/motion set inline style attributes; Google Fonts serves the stylesheet.
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:'],
              connectSrc: [
                "'self'",
                'https://*.supabase.co',
                'wss://*.supabase.co',
                process.env.VITE_SUPABASE_URL || '',
              ].filter(Boolean),
            },
          }
        : false,
  }),
);
app.use(express.json());

// Fire-and-forget so serverless cold starts are not delayed.
supabaseRepository.ensureStocksSeeded().catch(console.error);

/** The in-memory session for the requesting browser tab. */
function sessionFor(req: Request): UserSession {
  return getOrCreateSession(req.headers['x-session-id'] as string | undefined);
}

/** The watchlist named by ?watchlistId=, falling back to the active (or first) one. */
async function resolveWatchlist(req: AuthenticatedRequest, session: UserSession): Promise<Watchlist | undefined> {
  const requestedId = queryString(req.query.watchlistId, 64);
  if (req.token) {
    const { watchlists, activeId } = await supabaseRepository.getWatchlists(req.token);
    return watchlists.find((w) => w.id === (requestedId || activeId)) || watchlists[0];
  }
  return session.watchlists.find((w) => w.id === (requestedId || session.activeWatchlistId)) || session.watchlists[0];
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
  const { name, symbols } = req.body ?? {};
  const parsedName = parseName(name);
  if ('error' in parsedName) return res.status(400).json({ error: parsedName.error });
  const parsedSymbols = parseSymbols(symbols ?? []);
  if ('error' in parsedSymbols) return res.status(400).json({ error: parsedSymbols.error });
  try {
    if (req.token) {
      const data = await supabaseRepository.createWatchlist(req.token, parsedName.value, parsedSymbols.value);
      return res.json({ success: true, data });
    }
    const session = sessionFor(req);
    const watchlist: Watchlist = {
      id: `wl_${Date.now()}`,
      name: parsedName.value,
      symbols: parsedSymbols.value,
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
  if (!isValidId(id)) return res.status(404).json({ error: 'Watchlist not found' });
  const { name, symbols, setActive } = req.body ?? {};
  const parsedName = name === undefined ? undefined : parseName(name);
  if (parsedName && 'error' in parsedName) return res.status(400).json({ error: parsedName.error });
  const parsedSymbols = symbols === undefined ? undefined : parseSymbols(symbols);
  if (parsedSymbols && 'error' in parsedSymbols) return res.status(400).json({ error: parsedSymbols.error });
  if (setActive !== undefined && typeof setActive !== 'boolean') {
    return res.status(400).json({ error: 'setActive must be a boolean' });
  }
  const newName = parsedName && 'value' in parsedName ? parsedName.value : undefined;
  const newSymbols = parsedSymbols && 'value' in parsedSymbols ? parsedSymbols.value : undefined;
  if (!newName && !newSymbols && !setActive) {
    return res.status(400).json({ error: 'Nothing to update: provide name, symbols or setActive' });
  }
  try {
    if (req.token) {
      const data = await supabaseRepository.updateWatchlist(req.token, id, newName, newSymbols, setActive);
      return res.json({ success: true, data });
    }
    const session = sessionFor(req);
    const watchlist = session.watchlists.find((w) => w.id === id);
    if (!watchlist) return res.status(404).json({ error: 'Watchlist not found' });
    if (newName) watchlist.name = newName;
    if (newSymbols) watchlist.symbols = newSymbols;
    watchlist.updatedAt = Date.now();
    if (setActive) session.activeWatchlistId = id;
    res.json({ success: true, data: watchlist });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/watchlists/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(404).json({ error: 'Watchlist not found' });
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
    res.json({ success: true, data: await market.searchStocks(queryString(req.query.q, 50) ?? '') });
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
  if (!facts || typeof facts.symbol !== 'string' || !facts.symbol || facts.symbol.length > 20) {
    return res.status(400).json({ error: 'facts.symbol must be a ticker symbol' });
  }
  res.json({ success: true, narrative: buildExplanation(facts) });
});

// ── Session simulation (time away, mark as read, demo reset) ────────────────

app.post('/api/session/time-travel', (req, res) => {
  const session = sessionFor(req);
  const { preset, awaySeconds: requestedSeconds } = req.body ?? {};
  if (
    requestedSeconds !== undefined &&
    (typeof requestedSeconds !== 'number' || requestedSeconds < 0 || requestedSeconds > MAX_AWAY_SECONDS)
  ) {
    return res.status(400).json({ error: `awaySeconds must be a number between 0 and ${MAX_AWAY_SECONDS}` });
  }
  const awaySeconds = applyTimeTravel(session, typeof preset === 'string' ? preset : undefined, requestedSeconds);
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
