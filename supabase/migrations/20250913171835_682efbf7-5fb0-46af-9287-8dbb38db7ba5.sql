-- Drop all problematic policies first
DROP POLICY IF EXISTS "Anyone can view partnerships by invite code" ON public.partnerships;
DROP POLICY IF EXISTS "View partnership for joining by invite code" ON public.partnerships;

-- Create a security definer function that allows secure invite code lookup
-- This prevents direct table access while still allowing joins
CREATE OR REPLACE FUNCTION public.get_partnership_by_invite_code(invite_code_param TEXT)
RETURNS TABLE (
  id UUID,
  user1_id UUID, 
  status TEXT,
  invite_code TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.user1_id, p.status, p.invite_code
  FROM partnerships p
  WHERE p.invite_code = invite_code_param
    AND p.status = 'pending'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;