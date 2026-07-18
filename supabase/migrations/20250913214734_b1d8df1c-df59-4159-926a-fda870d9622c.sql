-- Add DELETE policy for user_swipes table so users can delete their own swipes
DROP POLICY IF EXISTS "Users can delete their own swipes" ON public.user_swipes;
CREATE POLICY "Users can delete their own swipes" 
ON public.user_swipes 
FOR DELETE 
USING (auth.uid() = user_id);