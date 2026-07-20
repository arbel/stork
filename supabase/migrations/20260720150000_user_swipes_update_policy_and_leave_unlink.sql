-- Root cause of "swipes gone when solo": user_swipes had SELECT/INSERT/DELETE policies but NO
-- UPDATE policy, so every client-side .update() on user_swipes was silently blocked by RLS
-- (0 rows, no error). That broke: unlinking swipes on leave, re-attaching them on join, and even
-- re-swipe upserts (INSERT ... ON CONFLICT DO UPDATE needs UPDATE permission).

DROP POLICY IF EXISTS "Users can update their own swipes" ON public.user_swipes;
CREATE POLICY "Users can update their own swipes"
ON public.user_swipes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also do the unlink server-side so leaving reliably keeps the user's picks (as "solo") regardless
-- of the client. Unlink BEFORE nulling user2 (the subquery keys off the active partnership).
CREATE OR REPLACE FUNCTION public.leave_partnership()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Keep the leaving user's swipes, just unlink them from the partnership they're leaving.
  UPDATE public.user_swipes
  SET partnership_id = NULL
  WHERE user_id = auth.uid()
    AND partnership_id IN (
      SELECT id FROM public.partnerships
      WHERE user2_id = auth.uid() AND status = 'active'
    );

  -- Remove the user from the partnership (back to a reusable pending invite for the admin).
  UPDATE public.partnerships
  SET user2_id = NULL, status = 'pending'
  WHERE user2_id = auth.uid() AND status = 'active';
END;
$$;
