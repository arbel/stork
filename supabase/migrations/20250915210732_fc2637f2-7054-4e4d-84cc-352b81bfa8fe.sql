-- Check and fix the SELECT policy for admin verification
-- First, list all existing policies
SELECT policyname FROM pg_policies WHERE tablename = 'admin_users';

-- Drop any existing SELECT policies
DROP POLICY IF EXISTS "Allow admin verification and management" ON public.admin_users;
DROP POLICY IF EXISTS "Only active admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;

-- Create the correct SELECT policy with a unique name
DROP POLICY IF EXISTS "Admin email verification and management access" ON public.admin_users;
CREATE POLICY "Admin email verification and management access" ON public.admin_users
  FOR SELECT 
  USING (
    -- Allow users to view admin records that match their email (for initial verification)
    (email = (SELECT email FROM auth.users WHERE id = auth.uid())) OR
    -- Allow existing active admins to view all admin records (for management)
    (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true))
  );