-- Stocks, watchlists and watchlist items, with Row-Level Security and atomic RPCs.
-- Safe to re-run: every statement is idempotent. Run after 20260905000001_create_profiles.sql.

-- ==========================================
-- 1. TABLES & CONSTRAINTS
-- ==========================================

-- Stocks Table
CREATE TABLE IF NOT EXISTS public.stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    exchange TEXT NOT NULL,
    sector TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure symbol is unique (handles the ON CONFLICT error)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stocks_symbol_key') THEN
    ALTER TABLE public.stocks ADD CONSTRAINT stocks_symbol_key UNIQUE (symbol);
  END IF;
END $$;

-- Watchlists Table
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Watchlist Items Table
CREATE TABLE IF NOT EXISTS public.watchlist_items (
    watchlist_id UUID NOT NULL REFERENCES public.watchlists(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (watchlist_id, stock_id)
);

-- Profile active watchlist column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'active_watchlist_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN active_watchlist_id UUID REFERENCES public.watchlists(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Stocks are readable by authenticated users" ON public.stocks;
DROP POLICY IF EXISTS "Users can view their own watchlists" ON public.watchlists;
DROP POLICY IF EXISTS "Users can insert their own watchlists" ON public.watchlists;
DROP POLICY IF EXISTS "Users can update their own watchlists" ON public.watchlists;
DROP POLICY IF EXISTS "Users can delete their own watchlists" ON public.watchlists;
DROP POLICY IF EXISTS "Users can view their own watchlist items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can insert their own watchlist items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can delete their own watchlist items" ON public.watchlist_items;

-- Stocks Policies
CREATE POLICY "Stocks are readable by authenticated users" 
ON public.stocks FOR SELECT TO authenticated USING (true);

-- Watchlists Policies
CREATE POLICY "Users can view their own watchlists"
ON public.watchlists FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watchlists"
ON public.watchlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlists"
ON public.watchlists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlists"
ON public.watchlists FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Watchlist Items Policies
CREATE POLICY "Users can view their own watchlist items"
ON public.watchlist_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.watchlists w WHERE w.id = watchlist_items.watchlist_id AND w.user_id = auth.uid()));

CREATE POLICY "Users can insert their own watchlist items"
ON public.watchlist_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.watchlists w WHERE w.id = watchlist_items.watchlist_id AND w.user_id = auth.uid()));

CREATE POLICY "Users can delete their own watchlist items"
ON public.watchlist_items FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.watchlists w WHERE w.id = watchlist_items.watchlist_id AND w.user_id = auth.uid()));


-- ==========================================
-- 3. ATOMIC RPC FUNCTIONS
-- ==========================================

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
  INSERT INTO public.watchlists (user_id, name, is_default)
  VALUES (auth.uid(), p_name, p_is_default)
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


CREATE OR REPLACE FUNCTION public.ensure_default_watchlist()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_count INT;
  v_watchlist_id UUID;
  v_result json;
BEGIN
  SELECT count(*) INTO v_count FROM public.watchlists WHERE user_id = auth.uid();
  IF v_count = 0 THEN
    SELECT public.create_watchlist_with_items(
      'Primary Watchlist',
      ARRAY['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'TATAMOTORS', 'AAPL', 'MSFT'],
      true
    ) INTO v_result;

    v_watchlist_id := (v_result->>'id')::UUID;
    UPDATE public.profiles SET active_watchlist_id = v_watchlist_id WHERE id = auth.uid();

    RETURN v_result;
  END IF;
  RETURN NULL;
END;
$$;


CREATE OR REPLACE FUNCTION public.replace_watchlist_items(
  p_watchlist_id UUID,
  p_name TEXT,
  p_symbols TEXT[]
) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_stock_id UUID;
  v_symbol TEXT;
BEGIN
  UPDATE public.watchlists SET name = p_name, updated_at = NOW() WHERE id = p_watchlist_id;
  DELETE FROM public.watchlist_items WHERE watchlist_id = p_watchlist_id;

  IF array_length(p_symbols, 1) > 0 THEN
    FOREACH v_symbol IN ARRAY p_symbols
    LOOP
      SELECT id INTO v_stock_id FROM public.stocks WHERE symbol = v_symbol;
      IF v_stock_id IS NOT NULL THEN
        INSERT INTO public.watchlist_items (watchlist_id, stock_id)
        VALUES (p_watchlist_id, v_stock_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END;
$$;

-- Force API Schema Reload
NOTIFY pgrst, 'reload schema';
