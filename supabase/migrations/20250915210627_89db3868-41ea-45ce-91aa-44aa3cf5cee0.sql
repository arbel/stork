-- Fix the SELECT policy to allow users to verify their own admin status
DROP POLICY IF EXISTS "Only active admins can view admin users" ON public.admin_users;

-- Create a new SELECT policy that allows:
-- 1. Users to check if they are admins (for initial verification)
-- 2. Existing active admins to view all admin users (for management)
DROP POLICY IF EXISTS "Allow admin verification and management" ON public.admin_users;
CREATE POLICY "Allow admin verification and management" ON public.admin_users
  FOR SELECT 
  USING (
    -- Allow users to view their own admin record for verification
    (email = (SELECT email FROM auth.users WHERE id = auth.uid())) OR
    -- Allow existing active admins to view all admin records
    (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true))
  );