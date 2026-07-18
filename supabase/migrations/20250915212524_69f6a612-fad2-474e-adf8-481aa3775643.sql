-- Clean up all existing admin_users policies and recreate them safely

-- Drop all existing policies completely
DROP POLICY IF EXISTS "Safe admin email verification and management access" ON public.admin_users;
DROP POLICY IF EXISTS "Safe admin user updates" ON public.admin_users;  
DROP POLICY IF EXISTS "Safe admin user inserts" ON public.admin_users;
DROP POLICY IF EXISTS "Safe admin user deletes" ON public.admin_users;

-- Drop and recreate the security definer functions to ensure they're correct
DROP FUNCTION IF EXISTS public.is_current_user_admin();
DROP FUNCTION IF EXISTS public.current_user_email_matches(text);

-- Create SECURITY DEFINER functions to prevent recursion
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

CREATE OR REPLACE FUNCTION public.current_user_email_matches(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (SELECT email FROM auth.users WHERE id = auth.uid()) = check_email;
$$;

-- Create completely new policies with unique names
DROP POLICY IF EXISTS "admin_users_select_policy" ON public.admin_users;
CREATE POLICY "admin_users_select_policy" ON public.admin_users
  FOR SELECT 
  USING (
    public.current_user_email_matches(email) OR 
    public.is_current_user_admin()
  );

DROP POLICY IF EXISTS "admin_users_update_policy" ON public.admin_users;
CREATE POLICY "admin_users_update_policy" ON public.admin_users
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

DROP POLICY IF EXISTS "admin_users_insert_policy" ON public.admin_users;
CREATE POLICY "admin_users_insert_policy" ON public.admin_users
  FOR INSERT 
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "admin_users_delete_policy" ON public.admin_users;
CREATE POLICY "admin_users_delete_policy" ON public.admin_users
  FOR DELETE 
  USING (public.is_current_user_admin() AND user_id != auth.uid());