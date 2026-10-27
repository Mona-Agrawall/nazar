import { createClient } from '@supabase/supabase-js';
import { Watchlist } from '../../src/types.js';
import { BASE_STOCKS } from '../data/stockUniverse.js';
import { getSupabaseConfig, isSupabaseConfigured } from '../config.js';
import { ClientError } from '../errors.js';

// User-scoped client: every query runs as the user, so PostgreSQL Row-Level Security applies.
function createUserClient(token: string) {
  const { url, publishableKey } = getSupabaseConfig();
  return createClient(url, publishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export const supabaseRepository = {
  /**
   * Seed the public.stocks table using Admin privileges. Skipped when Supabase is not configured (demo mode).
   */
  async ensureStocksSeeded() {
    const { url, secretKey } = getSupabaseConfig();
    if (!isSupabaseConfigured() || !secretKey) {
      console.log('[Supabase] Not configured — skipping stock seeding (demo mode).');
      return;
    }
    // Admin client (bypasses RLS) — only used to seed the stocks table.
    const adminClient = createClient(url, secretKey);
    console.log('[Supabase] Verifying master stock data...');
    const stocksToSeed = BASE_STOCKS.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      exchange: s.exchange,
      sector: s.sector,
    }));

    const { error } = await adminClient.from('stocks').upsert(stocksToSeed, { onConflict: 'symbol' });

    if (error) {
      console.error('[Supabase] Failed to seed stocks:', error.message);
    } else {
      console.log('[Supabase] Stock data verified in DB.');
    }
  },

  /**
   * Fetch all watchlists for a user.
   */
  async getWatchlists(token: string) {
    const db = createUserClient(token);

    // Attempt to init default watchlist — may fail if the user profile doesn't exist yet (expected in demo mode)
    const { error: initError } = await db.rpc('ensure_default_watchlist');
    if (initError && !initError.message.includes('foreign key')) {
      console.warn('[Supabase] ensure_default_watchlist:', initError.message);
    }

    // Fetch watchlists
    const { data: watchlists, error } = await db
      .from('watchlists')
      .select(
        `
        id,
        name,
        is_default,
        created_at,
        updated_at,
        watchlist_items (
          stocks ( symbol )
        )
      `,
      )
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Fetch active watchlist ID from profile
    const { data: profile } = await db.from('profiles').select('active_watchlist_id').single();

    const formattedWatchlists: Watchlist[] = (watchlists || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      isDefault: w.is_default,
      createdAt: new Date(w.created_at).getTime(),
      updatedAt: new Date(w.updated_at).getTime(),
      symbols: w.watchlist_items?.map((item: any) => item.stocks?.symbol).filter(Boolean) || [],
    }));

    return {
      watchlists: formattedWatchlists,
      activeId: profile?.active_watchlist_id || formattedWatchlists[0]?.id || null,
    };
  },

  /**
   * Create a new watchlist using our atomic RPC.
   */
  async createWatchlist(token: string, name: string, symbols: string[]) {
    const db = createUserClient(token);
    const { data, error } = await db.rpc('create_watchlist_with_items', {
      p_name: name,
      p_symbols: symbols,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing watchlist.
   */
  async updateWatchlist(token: string, watchlistId: string, name?: string, symbols?: string[], setActive?: boolean) {
    const db = createUserClient(token);

    // Replacing symbols goes through the RPC; a name-only change must not touch the items.
    // If only setActive is true, we just update the profile
    if (name && !symbols) {
      const { error } = await db
        .from('watchlists')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', watchlistId);
      if (error) throw error;
    } else if (symbols) {
      // If name isn't provided but we are replacing items, we need the current name to pass to RPC
      let finalName = name;
      if (!finalName) {
        const { data: wl } = await db.from('watchlists').select('name').eq('id', watchlistId).single();
        finalName = wl?.name || 'Updated Watchlist';
      }

      const { error } = await db.rpc('replace_watchlist_items', {
        p_watchlist_id: watchlistId,
        p_name: finalName,
        p_symbols: symbols,
      });
      if (error) throw error;
    }

    if (setActive) {
      const {
        data: { user },
      } = await db.auth.getUser();
      if (user) {
        await db.from('profiles').update({ active_watchlist_id: watchlistId }).eq('id', user.id);
      }
    }

    // Return the updated shape by re-fetching
    const { watchlists } = await this.getWatchlists(token);
    return watchlists.find((w) => w.id === watchlistId);
  },

  /**
   * Delete a watchlist.
   */
  async deleteWatchlist(token: string, watchlistId: string) {
    const db = createUserClient(token);

    // First, check if it's the default watchlist (RLS might allow delete, but app logic forbids)
    const { data: wl } = await db.from('watchlists').select('is_default').eq('id', watchlistId).single();
    if (wl?.is_default) {
      throw new ClientError('Cannot delete the default watchlist');
    }

    const { error } = await db.from('watchlists').delete().eq('id', watchlistId);
    if (error) throw error;

    // The FK sets profiles.active_watchlist_id to NULL only when the active watchlist was deleted;
    // otherwise the user's current selection stays as it is.
    const { data: profile } = await db.from('profiles').select('active_watchlist_id').single();
    if (profile?.active_watchlist_id) return profile.active_watchlist_id as string;

    const { watchlists } = await this.getWatchlists(token);
    const newActiveId = watchlists[0]?.id || null;
    const {
      data: { user },
    } = await db.auth.getUser();
    if (user && newActiveId) {
      await db.from('profiles').update({ active_watchlist_id: newActiveId }).eq('id', user.id);
    }

    return newActiveId;
  },
};
