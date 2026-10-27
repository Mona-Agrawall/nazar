-- Clients can no longer mark a watchlist as default: only ensure_default_watchlist() creates the default.
-- Safe to re-run. Run after 20261027000001_one_default_watchlist_per_user.sql. No data is changed.

-- 1. Column privileges: signed-in users may set a watchlist's name, never its is_default flag.
--    (Supabase grants INSERT/UPDATE on every column by default; RLS still limits rows to the owner.)
REVOKE INSERT, UPDATE ON public.watchlists FROM anon, authenticated;
GRANT INSERT (user_id, name) ON public.watchlists TO authenticated;
GRANT UPDATE (name, updated_at) ON public.watchlists TO authenticated;

-- 2. The client-callable RPC keeps its signature (existing callers keep working) but ignores p_is_default.
CREATE OR REPLACE FUNCTION public.create_watchlist_with_items(
  p_name TEXT,
  p_symbols TEXT[],
  p_is_default BOOLEAN DEFAULT false
) RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_watchlist_id UUID;
  v_stock_id UUID;
  v_symbol TEXT;
  v_result json;
BEGIN
  -- p_is_default is deliberately ignored: user-created watchlists are never the default.
  INSERT INTO public.watchlists (user_id, name)
  VALUES (auth.uid(), p_name)
  RETURNING id INTO v_watchlist_id;

  IF array_length(p_symbols, 1) > 0 THEN
    FOREACH v_symbol IN ARRAY p_symbols
    LOOP
      SELECT id INTO v_stock_id FROM public.stocks WHERE symbol = v_symbol;
      IF v_stock_id IS NOT NULL THEN
        INSERT INTO public.watchlist_items (watchlist_id, stock_id)
        VALUES (v_watchlist_id, v_stock_id)
        ON CONFLICT (watchlist_id, stock_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  SELECT json_build_object(
    'id', w.id,
    'name', w.name,
    'isDefault', w.is_default,
    'createdAt', extract(epoch from w.created_at) * 1000,
    'updatedAt', extract(epoch from w.updated_at) * 1000,
    'symbols', COALESCE((
        SELECT json_agg(s.symbol)
        FROM public.watchlist_items wi
        JOIN public.stocks s ON s.id = wi.stock_id
        WHERE wi.watchlist_id = w.id
      ), '[]'::json)
  ) INTO v_result
  FROM public.watchlists w WHERE w.id = v_watchlist_id;

  RETURN v_result;
END;
$$;

-- 3. ensure_default_watchlist runs with the owner's privileges so it can set is_default. It only ever
--    acts on auth.uid()'s own rows, and keeps the advisory lock + unique index from the previous migration.
CREATE OR REPLACE FUNCTION public.ensure_default_watchlist()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_watchlist_id UUID;
  v_result json;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('ensure_default_watchlist:' || v_user_id::text));

  IF EXISTS (SELECT 1 FROM public.watchlists WHERE user_id = v_user_id) THEN
    RETURN NULL;
  END IF;

  BEGIN
    INSERT INTO public.watchlists (user_id, name, is_default)
    VALUES (v_user_id, 'Primary Watchlist', true)
    RETURNING id INTO v_watchlist_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN NULL;
  END;

  INSERT INTO public.watchlist_items (watchlist_id, stock_id)
  SELECT v_watchlist_id, s.id
  FROM public.stocks s
  WHERE s.symbol = ANY (ARRAY['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'TATAMOTORS', 'AAPL', 'MSFT'])
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles SET active_watchlist_id = v_watchlist_id WHERE id = v_user_id;

  SELECT json_build_object(
    'id', w.id,
    'name', w.name,
    'isDefault', w.is_default,
    'createdAt', extract(epoch from w.created_at) * 1000,
    'updatedAt', extract(epoch from w.updated_at) * 1000,
    'symbols', COALESCE((
        SELECT json_agg(s.symbol)
        FROM public.watchlist_items wi
        JOIN public.stocks s ON s.id = wi.stock_id
        WHERE wi.watchlist_id = w.id
      ), '[]'::json)
  ) INTO v_result
  FROM public.watchlists w WHERE w.id = v_watchlist_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_default_watchlist() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_default_watchlist() TO authenticated;

NOTIFY pgrst, 'reload schema';
