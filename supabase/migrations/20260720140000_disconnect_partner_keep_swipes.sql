-- Disconnecting a partner must NOT delete anyone's swipes.
--
-- The client deleted the partner's swipes and then deleted the partnership — and since
-- user_swipes.partnership_id is ON DELETE CASCADE, deleting the partnership wiped whatever swipes
-- still referenced it. A user's name picks are theirs regardless of partner, so on disconnect we
-- just UNLINK swipes from the partnership (partnership_id -> NULL, i.e. "solo") and keep them; they
-- get re-pointed if/when the user joins a new partnership.
--
-- This runs as SECURITY DEFINER because the caller (admin) can't UPDATE their partner's swipes
-- under RLS. It only acts on the ACTIVE partnership the caller owns (user1).

CREATE OR REPLACE FUNCTION public.disconnect_partner()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p public.partnerships;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO p
  FROM public.partnerships
  WHERE user1_id = auth.uid() AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Preserve everyone's picks: unlink from the partnership instead of cascade-deleting them.
  UPDATE public.user_swipes SET partnership_id = NULL WHERE partnership_id = p.id;

  -- Now no swipes reference the row, so deleting it can't cascade any away.
  DELETE FROM public.partnerships WHERE id = p.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.disconnect_partner() TO authenticated;
