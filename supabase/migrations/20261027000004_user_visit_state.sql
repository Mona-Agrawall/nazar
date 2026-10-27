-- Per-user "last seen" baseline: when the user last checked and the prices at that moment.
-- Lets "what changed since your last visit" survive server restarts, new devices and serverless instances.
-- Safe to re-run. Run after 20261027000003_active_watchlist_ownership.sql.

CREATE TABLE IF NOT EXISTS public.user_visit_state (
    user_id UUID PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    last_visit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- { "SYMBOL": price, ... } at last_visit_at
    snapshot_prices JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_visit_state_snapshot_is_object CHECK (jsonb_typeof(snapshot_prices) = 'object'),
    CONSTRAINT user_visit_state_snapshot_size CHECK (pg_column_size(snapshot_prices) <= 65536)
);

ALTER TABLE public.user_visit_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own visit state" ON public.user_visit_state;
DROP POLICY IF EXISTS "Users can insert their own visit state" ON public.user_visit_state;
DROP POLICY IF EXISTS "Users can update their own visit state" ON public.user_visit_state;

CREATE POLICY "Users can view their own visit state"
ON public.user_visit_state FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own visit state"
ON public.user_visit_state FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own visit state"
ON public.user_visit_state FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
