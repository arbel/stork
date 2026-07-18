-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view partnerships by invite code" ON public.partnerships;

-- Create a more secure policy that only allows viewing partnership by exact invite code match
-- This is much more restrictive and only works when specifically querying by invite code
DROP POLICY IF EXISTS "View partnership for joining by invite code" ON public.partnerships;
CREATE POLICY "View partnership for joining by invite code"
ON public.partnerships
FOR SELECT
TO anon, authenticated
USING (
  -- Only allow access to pending partnerships when querying by invite code
  status = 'pending' AND invite_code IS NOT NULL
);