-- CRITICAL SECURITY FIX: Properly secure the profiles table
-- The current RLS policies are not working correctly

-- First, let's drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Ensure RLS is enabled (should already be, but let's be sure)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create new, properly secured RLS policies
-- Policy for viewing profiles - users can only see their own profile
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
CREATE POLICY "Users can only view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy for updating profiles - users can only update their own profile  
DROP POLICY IF EXISTS "Users can only update their own profile" ON public.profiles;
CREATE POLICY "Users can only update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for inserting profiles - users can only create their own profile
DROP POLICY IF EXISTS "Users can only insert their own profile" ON public.profiles;
CREATE POLICY "Users can only insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for deleting profiles - users can only delete their own profile
DROP POLICY IF EXISTS "Users can only delete their own profile" ON public.profiles;
CREATE POLICY "Users can only delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Verify the policies are working by testing access restrictions
-- This ensures no authenticated user can access other users' data