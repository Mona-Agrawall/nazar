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
  const headers: Record<string, string> = {
    'X-Session-Id': getSessionId(),
    ...extra,
  };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      headers['Authorization'] = `Bearer ${data.session.access_token}`;
    }
  }
  return headers;
}

/** Fetches JSON and throws on a non-2xx status, so callers never receive an error body as data. */
async function requestJSON(url: string, options: RequestInit = {}): Promise<any> {
  const headers = await getHeaders((options.headers as Record<string, string>) ?? {});
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
  const json = await requestJSON(url, options);
  return json.data !== undefined ? json.data : json;
}

export interface ExplanationFacts {
  symbol: string;
  priceChangePct: number;
  volumeMultiple: number;
  timeSinceLastSeen: string;
}

// ── API service layer ───────────────────────────────────────────────────────
export const api = {
  async getIndices(): Promise<MarketIndex[]> {
    return fetchJSON<MarketIndex[]>('/api/market/indices');
  },

  async getWatchlists(): Promise<{ watchlists: Watchlist[]; activeId: string }> {
    const json = await requestJSON('/api/watchlists');
    return { watchlists: json.data ?? [], activeId: json.activeId };
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
    const url = watchlistId
      ? `/api/market/stocks?watchlistId=${encodeURIComponent(watchlistId)}`
      : '/api/market/stocks';
    const json = await requestJSON(url);
    return { stocks: json.data ?? [], watchlist: json.watchlist };
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
    await requestJSON(`/api/market/events/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' });
  },

  async dismissEvent(id: string): Promise<void> {
    await requestJSON(`/api/market/events/${encodeURIComponent(id)}/dismiss`, { method: 'POST' });
  },

  async searchStocks(q: string): Promise<Stock[]> {
    return fetchJSON<Stock[]>(`/api/market/search?q=${encodeURIComponent(q)}`);
  },

  async getFeedStatus(): Promise<FeedStatus> {
    return fetchJSON<FeedStatus>('/api/market/status');
  },

  async timeTravel(preset: string): Promise<{ simulatedAwaySeconds: number; lastVisitTimestamp: number }> {
    return requestJSON('/api/session/time-travel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset }),
    });
  },

  async syncSession(): Promise<void> {
    await requestJSON('/api/session/sync', { method: 'POST' });
  },

  /** Records that the user left: like syncSession, but survives the page being hidden or closed. */
  async recordVisit(): Promise<void> {
    await requestJSON('/api/session/sync', { method: 'POST', keepalive: true });
  },

  // ── Demo reset ────────────────────────────────────────────────────────────
  // Restores the canonical "7h 42m away" demo scenario
  async resetDemo(): Promise<void> {
    await requestJSON('/api/demo/reset', { method: 'POST' });
  },

  // ── "Why it matters" explanation for a stock ──────────────────────────────
  async getExplanation(stock: Stock): Promise<string> {
    return api.getExplanationFor({
      symbol: stock.symbol,
      priceChangePct: stock.userDelta.percentDiff,
      volumeMultiple: stock.volumeRatio,
      timeSinceLastSeen: stock.userDelta.lastSeenTimeFormatted,
    });
  },

  async getExplanationFor(facts: ExplanationFacts): Promise<string> {
    try {
      const json = await requestJSON('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facts }),
      });
      return json.narrative;
    } catch {
      return `${facts.symbol} showed meaningful activity since your last visit.`;
    }
  },
};
