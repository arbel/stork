-- Add missing DELETE policy for partnerships table
DROP POLICY IF EXISTS "Users can delete partnerships they created" ON public.partnerships;
CREATE POLICY "Users can delete partnerships they created"
ON public.partnerships
FOR DELETE
TO authenticated
USING (auth.uid() = user1_id);