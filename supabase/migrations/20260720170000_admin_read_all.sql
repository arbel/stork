-- Admin analytics: the dashboard aggregates profiles / user_swipes / partnerships, but RLS only
-- exposes each user's own (+ partner's) rows, so the panel showed 0 users / 0 activity. Add
-- ADDITIVE admin-only SELECT policies (RLS policies are OR'd, so non-admins are unaffected — they
-- still only see their own rows; an active admin additionally sees everything).
--
-- is_current_user_admin() is SECURITY DEFINER and checks admin_users for auth.uid(), so this only
-- grants extra visibility to signed-in admins.

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can view all swipes" ON public.user_swipes;
CREATE POLICY "Admins can view all swipes"
ON public.user_swipes FOR SELECT
USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can view all partnerships" ON public.partnerships;
CREATE POLICY "Admins can view all partnerships"
ON public.partnerships FOR SELECT
USING (public.is_current_user_admin());
