-- Fix security vulnerabilities in admin_users table RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Allow admin user inserts" ON public.admin_users;
DROP POLICY IF EXISTS "Allow admin user creation and updates" ON public.admin_users;

-- Create secure INSERT policy - only existing admins can add new admin users
DROP POLICY IF EXISTS "Only admins can insert admin users" ON public.admin_users;
CREATE POLICY "Only admins can insert admin users" ON public.admin_users
  FOR INSERT 
  WITH CHECK (
    -- Only existing active admin users can insert new admin users
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create secure UPDATE policy with tighter controls
DROP POLICY IF EXISTS "Secure admin user updates" ON public.admin_users;
CREATE POLICY "Secure admin user updates" ON public.admin_users
  FOR UPDATE 
  USING (
    -- Allow update if user_id is null AND email matches current user (for initial setup)
    -- OR if current user is the admin being updated
    -- OR if current user is an existing active admin (for admin management)
    (
      (user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid())) OR
      (user_id = auth.uid()) OR
      (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true))
    )
  )
  WITH CHECK (
    -- Ensure the updated record maintains security constraints
    (
      (user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid())) OR
      (user_id = auth.uid()) OR
      (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true))
    )
  );

-- Add DELETE policy - only existing active admins can delete admin users
DROP POLICY IF EXISTS "Only admins can delete admin users" ON public.admin_users;
CREATE POLICY "Only admins can delete admin users" ON public.admin_users
  FOR DELETE 
  USING (
    -- Only existing active admin users can delete admin users
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
    -- Prevent self-deletion to avoid lockout
    AND user_id != auth.uid()
  );

-- Create a more secure function for checking admin status
CREATE OR REPLACE FUNCTION public.is_active_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = check_user_id AND is_active = true
  );
$$;

-- Update the existing SELECT policy to use the secure function
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only active admins can view admin users" ON public.admin_users;
CREATE POLICY "Only active admins can view admin users" ON public.admin_users
  FOR SELECT 
  USING (public.is_active_admin(auth.uid()));

-- Add comment explaining the security measures
COMMENT ON TABLE public.admin_users IS 'Admin users table with secure RLS policies to prevent unauthorized access to admin email addresses and sensitive data';