-- Add policy to allow users to join partnerships via invite code
DROP POLICY IF EXISTS "Users can join partnerships via invite code" ON public.partnerships;
CREATE POLICY "Users can join partnerships via invite code" 
ON public.partnerships 
FOR UPDATE 
USING (status = 'pending' AND user2_id IS NULL)
WITH CHECK (status = 'active' AND user2_id IS NOT NULL);