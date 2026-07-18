-- Drop the existing invite code policy and create a better one
DROP POLICY IF EXISTS "Users can join partnerships via invite code" ON public.partnerships;

-- Create a more permissive policy for joining partnerships via invite code
DROP POLICY IF EXISTS "Allow joining partnerships with invite code" ON public.partnerships;
CREATE POLICY "Allow joining partnerships with invite code" 
ON public.partnerships 
FOR UPDATE 
USING (
  status = 'pending' 
  AND user2_id IS NULL 
  AND auth.uid() IS NOT NULL
  AND auth.uid() != user1_id  -- Prevent the creator from joining their own partnership
);