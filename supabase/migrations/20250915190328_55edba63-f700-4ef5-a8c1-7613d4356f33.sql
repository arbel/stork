-- Allow partners in active partnerships to see each other's basic profile information
DROP POLICY IF EXISTS "Partners can view each other's basic profile info" ON public.profiles;
CREATE POLICY "Partners can view each other's basic profile info"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.partnerships p
      WHERE p.status = 'active'
      AND (
        (p.user1_id = auth.uid() AND p.user2_id = profiles.user_id) OR
        (p.user2_id = auth.uid() AND p.user1_id = profiles.user_id)
      )
    )
  )
);