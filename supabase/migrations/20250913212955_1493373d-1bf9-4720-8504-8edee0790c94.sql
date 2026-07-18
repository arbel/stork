-- Allow users to view swipes from their partner in the same partnership
DROP POLICY IF EXISTS "Users can view their own swipes" ON public.user_swipes;

-- Create new policy that allows viewing own swipes AND partner's swipes in same partnership
DROP POLICY IF EXISTS "Users can view their own and partner swipes" ON public.user_swipes;
CREATE POLICY "Users can view their own and partner swipes" 
ON public.user_swipes 
FOR SELECT 
USING (
  -- Can see own swipes
  auth.uid() = user_id 
  OR 
  -- Can see partner's swipes if in same active partnership
  EXISTS (
    SELECT 1 FROM public.partnerships p
    WHERE p.id = user_swipes.partnership_id
    AND p.status = 'active'
    AND (
      (p.user1_id = auth.uid() AND p.user2_id = user_swipes.user_id) OR
      (p.user2_id = auth.uid() AND p.user1_id = user_swipes.user_id)
    )
  )
);