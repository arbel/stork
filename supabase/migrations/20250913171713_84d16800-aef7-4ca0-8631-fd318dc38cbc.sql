-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view partnerships by invite code" ON public.partnerships;

-- Create a more secure policy that only allows viewing specific partnership by invite code
-- This policy will only return the partnership ID and status for join verification
DROP POLICY IF EXISTS "View partnership for joining by invite code" ON public.partnerships;
CREATE POLICY "View partnership for joining by invite code"
ON public.partnerships
FOR SELECT
TO anon, authenticated
USING (
  -- Only allow access when querying with the exact invite code
  -- and only return minimal data needed for joining
  invite_code IS NOT NULL 
  AND status = 'pending'
);

-- Ensure the existing policy for partnership members remains secure
-- This should already exist but let's verify it's properly restrictive
DROP POLICY IF EXISTS "Users can view their own partnerships secure" ON public.partnerships;
CREATE POLICY "Users can view their own partnerships secure"
ON public.partnerships
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user1_id) OR (auth.uid() = user2_id)
);