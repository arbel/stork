-- Fix RLS policies for admin_users table to allow proper user_id updates
DROP POLICY IF EXISTS "Admins can update admin users" ON public.admin_users;

-- Create new policy that allows users to update their own admin record when user_id is null
DROP POLICY IF EXISTS "Allow admin user creation and updates" ON public.admin_users;
CREATE POLICY "Allow admin user creation and updates" ON public.admin_users
  FOR UPDATE USING (
    -- Allow if user_id is null and email matches (for initial setup)
    (user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid())) OR
    -- Allow if user_id matches authenticated user (for subsequent updates)
    (user_id = auth.uid())
  );

-- Also allow INSERT for admin users in case needed
DROP POLICY IF EXISTS "Allow admin user inserts" ON public.admin_users;
CREATE POLICY "Allow admin user inserts" ON public.admin_users
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);