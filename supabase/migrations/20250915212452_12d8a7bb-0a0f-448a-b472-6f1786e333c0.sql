-- Fix infinite recursion in admin_users RLS policies

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Secure admin user updates" ON public.admin_users;
DROP POLICY IF EXISTS "Admin email verification and management access" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can delete admin users" ON public.admin_users;

-- Create a SECURITY DEFINER function to check admin status
-- This prevents recursion by executing with elevated privileges
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

-- Create a SECURITY DEFINER function to check if email matches current user
CREATE OR REPLACE FUNCTION public.current_user_email_matches(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (SELECT email FROM auth.users WHERE id = auth.uid()) = check_email;
$$;

-- Now create safe policies using the security definer functions

-- SELECT policy: Allow users to view admin records matching their email OR existing admins to view all
DROP POLICY IF EXISTS "Safe admin email verification and management access" ON public.admin_users;
CREATE POLICY "Safe admin email verification and management access" ON public.admin_users
  FOR SELECT 
  USING (
    public.current_user_email_matches(email) OR 
    public.is_current_user_admin()
  );

-- UPDATE policy: Allow initial setup by email match OR admin self-updates OR admin management
DROP POLICY IF EXISTS "Safe admin user updates" ON public.admin_users;
CREATE POLICY "Safe admin user updates" ON public.admin_users
  FOR UPDATE 
  USING (
    (user_id IS NULL AND public.current_user_email_matches(email)) OR
    (user_id = auth.uid()) OR
    public.is_current_user_admin()
  )
  WITH CHECK (
    (user_id IS NULL AND public.current_user_email_matches(email)) OR
    (user_id = auth.uid()) OR
    public.is_current_user_admin()
  );

-- INSERT policy: Only existing admins can add new admin users
DROP POLICY IF EXISTS "Safe admin user inserts" ON public.admin_users;
CREATE POLICY "Safe admin user inserts" ON public.admin_users
  FOR INSERT 
  WITH CHECK (public.is_current_user_admin());

-- DELETE policy: Only existing admins can delete admin users (no self-deletion)
DROP POLICY IF EXISTS "Safe admin user deletes" ON public.admin_users;
CREATE POLICY "Safe admin user deletes" ON public.admin_users
  FOR DELETE 
  USING (public.is_current_user_admin() AND user_id != auth.uid());