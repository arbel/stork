-- Allow unauthenticated users to view partnerships by invite code for joining purposes
DROP POLICY IF EXISTS "Anyone can view partnerships by invite code" ON public.partnerships;
CREATE POLICY "Anyone can view partnerships by invite code"
ON public.partnerships
FOR SELECT
TO anon, authenticated
USING (invite_code IS NOT NULL);