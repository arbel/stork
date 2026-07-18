-- Drop the current policy that's still too broad
DROP POLICY IF EXISTS "View partnership for joining by invite code" ON public.partnerships;

-- Create a security definer function that only returns partnership data when accessed with valid invite code
CREATE OR REPLACE FUNCTION public.get_partnership_by_invite_code(invite_code_param text)
RETURNS TABLE (
  id uuid,
  user1_id uuid,
  status text,
  invite_code text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return partnership if it's pending and matches the exact invite code
  RETURN QUERY
  SELECT p.id, p.user1_id, p.status, p.invite_code
  FROM partnerships p
  WHERE p.invite_code = invite_code_param 
  AND p.status = 'pending'
  LIMIT 1;
END;
$$;

-- Create a much more restrictive policy for join functionality
DROP POLICY IF EXISTS "View partnership for joining with invite code function" ON public.partnerships;
CREATE POLICY "View partnership for joining with invite code function"
ON public.partnerships
FOR SELECT
TO anon, authenticated
USING (false); -- Block direct access, force use of the function

-- Keep the existing secure policy for partnership members
-- Users can only view partnerships they're part of
DROP POLICY IF EXISTS "Users can view their partnerships" ON public.partnerships;
CREATE POLICY "Users can view their partnerships"
ON public.partnerships
FOR SELECT
TO authenticated
USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);