import { supabase } from '../lib/supabase';
import { Stock, MarketIndex, MarketEvent, Watchlist, MarketPulse, StockDetailExtended, FeedStatus } from '../types';

// ── Session ID — one UUID per browser tab ───────────────────────────────────
// sessionStorage (not localStorage) gives each tab its own server-side demo session.
const SESSION_ID_KEY = 'nazar_session_id';

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

// ── Headers helper — attaches both auth JWT and session ID ───────────────────
async function getHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'X-Session-Id': getSessionId(),
    ...extra,
  };
  if (data?.session?.access_token) {
    headers['Authorization'] = `Bearer ${data.session.access_token}`;
  }
  return headers;
}

async function fetchJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = await getHeaders((options.headers as Record<string, string>) ?? {});
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

// ── API service layer ───────────────────────────────────────────────────────
export const api = {
  async getIndices(): Promise<MarketIndex[]> {
    return fetchJSON<MarketIndex[]>('/api/market/indices');
  },

  async getWatchlists(): Promise<{ watchlists: Watchlist[]; activeId: string }> {
    const headers = await getHeaders();
    const json = await fetch('/api/watchlists', { headers }).then((r) => r.json());
    return { watchlists: json.data, activeId: json.activeId };
  },

  async createWatchlist(name: string, symbols: string[]): Promise<Watchlist> {
    return fetchJSON<Watchlist>('/api/watchlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, symbols }),
    });
  },

  async updateWatchlist(
    id: string,
    updates: { name?: string; symbols?: string[]; setActive?: boolean },
  ): Promise<Watchlist> {
    return fetchJSON<Watchlist>(`/api/watchlists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  },

  async getStocks(watchlistId?: string): Promise<{ stocks: Stock[]; watchlist: Watchlist }> {
    const headers = await getHeaders();
    const url = watchlistId
      ? `/api/market/stocks?watchlistId=${encodeURIComponent(watchlistId)}`
      : '/api/market/stocks';
    const json = await fetch(url, { headers }).then((r) => r.json());
    return { stocks: json.data, watchlist: json.watchlist };
  },

  async getAllStocks(): Promise<Stock[]> {
    return fetchJSON<Stock[]>('/api/market/stocks/all');
  },

  async getStockDetail(symbol: string): Promise<StockDetailExtended> {
    return fetchJSON<StockDetailExtended>(`/api/market/stocks/${encodeURIComponent(symbol)}`);
  },

  async getPulse(watchlistId?: string): Promise<MarketPulse> {
    const url = watchlistId ? `/api/market/pulse?watchlistId=${encodeURIComponent(watchlistId)}` : '/api/market/pulse';
    return fetchJSON<MarketPulse>(url);
  },

  async getEvents(watchlistId?: string): Promise<MarketEvent[]> {
    const url = watchlistId
      ? `/api/market/events?watchlistId=${encodeURIComponent(watchlistId)}`
      : '/api/market/events';
    return fetchJSON<MarketEvent[]>(url);
  },

  async acknowledgeEvent(id: string): Promise<void> {
    const headers = await getHeaders();
    await fetch(`/api/market/events/${encodeURIComponent(id)}/acknowledge`, { method: 'POST', headers });
  },

  async dismissEvent(id: string): Promise<void> {
    const headers = await getHeaders();
    await fetch(`/api/market/events/${encodeURIComponent(id)}/dismiss`, { method: 'POST', headers });
  },

  async searchStocks(q: string): Promise<Stock[]> {
    return fetchJSON<Stock[]>(`/api/market/search?q=${encodeURIComponent(q)}`);
  },

  async getFeedStatus(): Promise<FeedStatus> {
    return fetchJSON<FeedStatus>('/api/market/status');
  },

  async timeTravel(preset: string): Promise<{ simulatedAwaySeconds: number; lastVisitTimestamp: number }> {
    const headers = await getHeaders({ 'Content-Type': 'application/json' });
    const res = await fetch('/api/session/time-travel', {
      method: 'POST',
      headers,
      body: JSON.stringify({ preset }),
    });
    return res.json();
  },

  async syncSession(): Promise<void> {
    const headers = await getHeaders();
    await fetch('/api/session/sync', { method: 'POST', headers });
  },

  // ── Demo reset ────────────────────────────────────────────────────────────
  // Restores the canonical "7h 42m away" demo scenario
  async resetDemo(): Promise<void> {
    const headers = await getHeaders();
    await fetch('/api/demo/reset', { method: 'POST', headers });
  },

  // ── "Why it matters" explanation for a stock ──────────────────────────────
  async getExplanation(stock: Stock): Promise<string> {
    const facts = {
      symbol: stock.symbol,
      priceChangePct: stock.userDelta.percentDiff,
      volumeMultiple: stock.volumeRatio,
      timeSinceLastSeen: stock.userDelta.lastSeenTimeFormatted,
    };
    try {
      const headers = await getHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/explain', { method: 'POST', headers, body: JSON.stringify({ facts }) });
      const json = await res.json();
      return json.narrative;
    } catch {
      return `${stock.symbol} showed meaningful activity since your last visit.`;
    }
  },
};
