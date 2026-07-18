-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.partnerships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_swipes;