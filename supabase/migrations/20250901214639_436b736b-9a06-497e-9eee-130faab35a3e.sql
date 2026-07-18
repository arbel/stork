-- Add missing INSERT policy for notifications table
-- This allows the system to create notifications for users when partnerships are formed

DROP POLICY IF EXISTS "System can insert notifications for users" ON public.notifications;
CREATE POLICY "System can insert notifications for users" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Also add a policy for functions to insert notifications
DROP POLICY IF EXISTS "Functions can insert notifications" ON public.notifications;
CREATE POLICY "Functions can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);