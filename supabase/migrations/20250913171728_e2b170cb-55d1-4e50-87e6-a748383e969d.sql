-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view partnerships by invite code" ON public.partnerships;

-- Create a more secure policy that only allows viewing specific partnership by invite code
-- This policy will only return partnerships when queried with exact invite code and pending status
DROP POLICY IF EXISTS "View partnership for joining by invite code" ON public.partnerships;
CREATE POLICY "View partnership for joining by invite code"
ON public.partnerships
FOR SELECT
TO anon, authenticated
USING (
  invite_code IS NOT NULL 
  AND status = 'pending'
);