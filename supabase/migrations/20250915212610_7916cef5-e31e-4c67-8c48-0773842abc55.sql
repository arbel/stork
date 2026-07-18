-- Drop everything in the correct order to avoid dependencies

-- First, drop all policies
DROP POLICY IF EXISTS "admin_users_select_policy" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_update_policy" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_insert_policy" ON public.admin_users;  
DROP POLICY IF EXISTS "admin_users_delete_policy" ON public.admin_users;

-- Then drop the functions
DROP FUNCTION IF EXISTS public.is_current_user_admin();
DROP FUNCTION IF EXISTS public.current_user_email_matches(text);

-- Now recreate the SECURITY DEFINER functions
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

-- Finally, create the new safe policies
DROP POLICY IF EXISTS "admin_users_select_safe" ON public.admin_users;
CREATE POLICY "admin_users_select_safe" ON public.admin_users
  FOR SELECT 
  USING (
    public.current_user_email_matches(email) OR 
    public.is_current_user_admin()
  );

DROP POLICY IF EXISTS "admin_users_update_safe" ON public.admin_users;
CREATE POLICY "admin_users_update_safe" ON public.admin_users
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

DROP POLICY IF EXISTS "admin_users_insert_safe" ON public.admin_users;
CREATE POLICY "admin_users_insert_safe" ON public.admin_users
  FOR INSERT 
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "admin_users_delete_safe" ON public.admin_users;
CREATE POLICY "admin_users_delete_safe" ON public.admin_users
  FOR DELETE 
  USING (public.is_current_user_admin() AND user_id != auth.uid());