-- At most one default watchlist per user, and a race-safe ensure_default_watchlist().
-- Safe to re-run. Run after 20260905000002_create_watchlists.sql.
-- No rows are deleted: duplicate defaults left by the old race are kept but demoted to normal watchlists.

UPDATE public.watchlists w
SET is_default = false, updated_at = NOW()
WHERE w.is_default
  AND EXISTS (
    SELECT 1 FROM public.watchlists older
    WHERE older.user_id = w.user_id
      AND older.is_default
      AND (older.created_at, older.id) < (w.created_at, w.id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS watchlists_one_default_per_user
  ON public.watchlists (user_id) WHERE is_default;

CREATE OR REPLACE FUNCTION public.ensure_default_watchlist()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_watchlist_id UUID;
  v_result json;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- Serialise concurrent first loads for the same user until this transaction ends,
  -- so the existence check below sees a watchlist created by a parallel request.
  PERFORM pg_advisory_xact_lock(hashtext('ensure_default_watchlist:' || auth.uid()::text));

  IF EXISTS (SELECT 1 FROM public.watchlists WHERE user_id = auth.uid()) THEN
    RETURN NULL;
  END IF;

  BEGIN
    SELECT public.create_watchlist_with_items(
      'Primary Watchlist',
      ARRAY['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'TATAMOTORS', 'AAPL', 'MSFT'],
      true
    ) INTO v_result;
  EXCEPTION WHEN unique_violation THEN
    -- Another transaction created the default first (the unique index is the final guard).
    RETURN NULL;
  END;

  v_watchlist_id := (v_result->>'id')::UUID;
  UPDATE public.profiles SET active_watchlist_id = v_watchlist_id WHERE id = auth.uid();

  RETURN v_result;
END;
$$;

NOTIFY pgrst, 'reload schema';
