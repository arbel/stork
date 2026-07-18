-- List and fix all partnership policies
-- First drop all existing SELECT policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view partnerships they participate in" ON public.partnerships;
DROP POLICY IF EXISTS "Users can view their partnerships" ON public.partnerships;
DROP POLICY IF EXISTS "Users can view their own partnerships" ON public.partnerships;
DROP POLICY IF EXISTS "View partnership for joining with invite code function" ON public.partnerships;

-- Create a comprehensive SELECT policy for partnerships
DROP POLICY IF EXISTS "Partnership visibility" ON public.partnerships;
CREATE POLICY "Partnership visibility" 
ON public.partnerships 
FOR SELECT 
USING (
  -- Users can view partnerships they're part of
  (auth.uid() = user1_id) OR 
  (auth.uid() = user2_id) OR
  -- Allow viewing partnerships during join process for invite codes
  (status = 'pending' AND user2_id IS NULL)
);