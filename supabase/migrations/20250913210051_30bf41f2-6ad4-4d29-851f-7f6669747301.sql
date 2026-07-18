-- Fix the partnership SELECT policy to allow users to see partnerships they just joined
-- First, let's check the current policies and update them

-- Drop and recreate the SELECT policy to be more permissive for join operations
DROP POLICY IF EXISTS "Users can view their partnerships" ON public.partnerships;
DROP POLICY IF EXISTS "Users can view their own partnerships" ON public.partnerships;

-- Create a new SELECT policy that allows users to view partnerships they're involved in
-- including immediately after they join (when they become user2_id)
DROP POLICY IF EXISTS "Users can view partnerships they participate in" ON public.partnerships;
CREATE POLICY "Users can view partnerships they participate in" 
ON public.partnerships 
FOR SELECT 
USING (
  (auth.uid() = user1_id) OR 
  (auth.uid() = user2_id) OR
  -- Allow viewing during join process (when user is about to become user2_id)
  (status = 'pending' AND user2_id IS NULL AND auth.uid() IS NOT NULL)
);