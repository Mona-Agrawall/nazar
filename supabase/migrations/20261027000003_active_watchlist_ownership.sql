-- profiles.active_watchlist_id may only reference one of the profile owner's own watchlists.
-- Safe to re-run. Run after 20261027000002_server_controlled_default_watchlist.sql.

-- Existing references to someone else's watchlist are cleared (set to NULL; the app then falls back to the
-- user's first watchlist). No rows are deleted.
UPDATE public.profiles p
SET active_watchlist_id = NULL, updated_at = NOW()
WHERE p.active_watchlist_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.watchlists w WHERE w.id = p.active_watchlist_id AND w.user_id = p.id
  );

CREATE OR REPLACE FUNCTION public.check_active_watchlist_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active_watchlist_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.watchlists WHERE id = NEW.active_watchlist_id AND user_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'active_watchlist_id must reference one of your own watchlists' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_active_watchlist_owner ON public.profiles;
CREATE TRIGGER profiles_active_watchlist_owner
BEFORE INSERT OR UPDATE OF active_watchlist_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_active_watchlist_owner();
