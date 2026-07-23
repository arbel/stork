-- RLS perf: wrap auth.uid() / is_current_user_admin() in scalar subselects so Postgres
-- evaluates them ONCE per query (InitPlan) instead of once per row. Before this,
-- admin_users had 114k+ seq scans because the admin policies called
-- is_current_user_admin() for every candidate row of every query on the hot tables.
-- Semantics are identical — only evaluation frequency changes.
--
-- Policies are recreated 1:1 from the live pg_policies dump (2026-07-23).

-- ---------------------------------------------------------------- names
DROP POLICY IF EXISTS "Admins can manage all names" ON public.names;
CREATE POLICY "Admins can manage all names"
ON public.names FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.admin_users
  WHERE admin_users.user_id = (SELECT auth.uid()) AND admin_users.is_active = true
));

-- ---------------------------------------------------------- notifications
DROP POLICY IF EXISTS "Users can insert their own notifications only" ON public.notifications;
CREATE POLICY "Users can insert their own notifications only"
ON public.notifications FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------- partnerships
DROP POLICY IF EXISTS "Admins can view all partnerships" ON public.partnerships;
CREATE POLICY "Admins can view all partnerships"
ON public.partnerships FOR SELECT
USING ((SELECT public.is_current_user_admin()));

DROP POLICY IF EXISTS "Allow joining partnerships with invite code" ON public.partnerships;
CREATE POLICY "Allow joining partnerships with invite code"
ON public.partnerships FOR UPDATE
USING (
  (status = 'pending'::text) AND (user2_id IS NULL)
  AND ((SELECT auth.uid()) IS NOT NULL) AND ((SELECT auth.uid()) <> user1_id)
);

DROP POLICY IF EXISTS "Secure partnership visibility" ON public.partnerships;
CREATE POLICY "Secure partnership visibility"
ON public.partnerships FOR SELECT
USING (((SELECT auth.uid()) = user1_id) OR ((SELECT auth.uid()) = user2_id));

DROP POLICY IF EXISTS "Users can view their own partnerships secure" ON public.partnerships;
CREATE POLICY "Users can view their own partnerships secure"
ON public.partnerships FOR SELECT
USING (((SELECT auth.uid()) = user1_id) OR ((SELECT auth.uid()) = user2_id));

DROP POLICY IF EXISTS "Users can create partnerships" ON public.partnerships;
CREATE POLICY "Users can create partnerships"
ON public.partnerships FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user1_id);

DROP POLICY IF EXISTS "Users can delete partnerships they created" ON public.partnerships;
CREATE POLICY "Users can delete partnerships they created"
ON public.partnerships FOR DELETE
USING ((SELECT auth.uid()) = user1_id);

DROP POLICY IF EXISTS "Users can update partnerships they're part of" ON public.partnerships;
CREATE POLICY "Users can update partnerships they're part of"
ON public.partnerships FOR UPDATE
USING (((SELECT auth.uid()) = user1_id) OR ((SELECT auth.uid()) = user2_id))
WITH CHECK (((SELECT auth.uid()) = user1_id) OR ((SELECT auth.uid()) = user2_id));

-- --------------------------------------------------------------- profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING ((SELECT public.is_current_user_admin()));

DROP POLICY IF EXISTS "Partners can view each other's basic profile info" ON public.profiles;
CREATE POLICY "Partners can view each other's basic profile info"
ON public.profiles FOR SELECT
USING (
  ((SELECT auth.uid()) IS NOT NULL)
  AND (
    ((SELECT auth.uid()) = user_id)
    OR EXISTS (
      SELECT 1 FROM public.partnerships p
      WHERE p.status = 'active'::text
        AND (
          (p.user1_id = (SELECT auth.uid()) AND p.user2_id = profiles.user_id)
          OR (p.user2_id = (SELECT auth.uid()) AND p.user1_id = profiles.user_id)
        )
    )
  )
);

DROP POLICY IF EXISTS "Users can only delete their own profile" ON public.profiles;
CREATE POLICY "Users can only delete their own profile"
ON public.profiles FOR DELETE
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can only insert their own profile" ON public.profiles;
CREATE POLICY "Users can only insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can only update their own profile" ON public.profiles;
CREATE POLICY "Users can only update their own profile"
ON public.profiles FOR UPDATE
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
CREATE POLICY "Users can only view their own profile"
ON public.profiles FOR SELECT
USING ((SELECT auth.uid()) = user_id);

-- ------------------------------------------------------------ user_swipes
DROP POLICY IF EXISTS "Admins can view all swipes" ON public.user_swipes;
CREATE POLICY "Admins can view all swipes"
ON public.user_swipes FOR SELECT
USING ((SELECT public.is_current_user_admin()));

DROP POLICY IF EXISTS "Users can delete their own swipes" ON public.user_swipes;
CREATE POLICY "Users can delete their own swipes"
ON public.user_swipes FOR DELETE
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own swipes" ON public.user_swipes;
CREATE POLICY "Users can insert their own swipes"
ON public.user_swipes FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own swipes" ON public.user_swipes;
CREATE POLICY "Users can update their own swipes"
ON public.user_swipes FOR UPDATE
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own and partner swipes" ON public.user_swipes;
CREATE POLICY "Users can view their own and partner swipes"
ON public.user_swipes FOR SELECT
USING (
  ((SELECT auth.uid()) = user_id)
  OR EXISTS (
    SELECT 1 FROM public.partnerships p
    WHERE p.id = user_swipes.partnership_id
      AND p.status = 'active'::text
      AND (
        (p.user1_id = (SELECT auth.uid()) AND p.user2_id = user_swipes.user_id)
        OR (p.user2_id = (SELECT auth.uid()) AND p.user1_id = user_swipes.user_id)
      )
  )
);
