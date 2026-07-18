-- Baby Name Swipe Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable RLS (Row Level Security)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create partnerships table
CREATE TABLE partnerships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'active')) DEFAULT 'pending',
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Create user_swipes table
CREATE TABLE user_swipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partnership_id UUID REFERENCES partnerships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_data JSONB DEFAULT '{}', -- Store full name object
  action TEXT CHECK (action IN ('like', 'pass')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security Policies

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Partnerships policies
CREATE POLICY "Users can view own partnerships" ON partnerships
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create partnerships" ON partnerships
  FOR INSERT WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "Users can update own partnerships" ON partnerships
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- User swipes policies
CREATE POLICY "Users can view own swipes" ON user_swipes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own swipes" ON user_swipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Partners can view each other's swipes
CREATE POLICY "Partners can view partner swipes" ON user_swipes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partnerships 
      WHERE (user1_id = auth.uid() AND user2_id = user_swipes.user_id)
         OR (user2_id = auth.uid() AND user1_id = user_swipes.user_id)
      AND status = 'active'
      AND partnership_id = partnerships.id
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Functions

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create notification when partnership is created
CREATE OR REPLACE FUNCTION notify_partner_joined()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify user1 when user2 joins
  IF NEW.status = 'active' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user1_id,
      'partner_joined',
      'Your partner joined! 🎉',
      'Start swiping together to find the perfect baby name!',
      jsonb_build_object('partnership_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for partnership notifications
CREATE TRIGGER on_partnership_updated
  AFTER UPDATE ON partnerships
  FOR EACH ROW EXECUTE PROCEDURE notify_partner_joined();

-- Function to create match notification
CREATE OR REPLACE FUNCTION check_for_matches()
RETURNS TRIGGER AS $$
DECLARE
  partner_user_id UUID;
  partner_liked BOOLEAN := FALSE;
BEGIN
  -- Get partner's user_id
  SELECT 
    CASE 
      WHEN user1_id = NEW.user_id THEN user2_id 
      ELSE user1_id 
    END INTO partner_user_id
  FROM partnerships 
  WHERE id = NEW.partnership_id AND status = 'active';
  
  -- Check if partner also liked this name
  SELECT EXISTS(
    SELECT 1 FROM user_swipes 
    WHERE user_id = partner_user_id 
    AND partnership_id = NEW.partnership_id
    AND name = NEW.name 
    AND action = 'like'
  ) INTO partner_liked;
  
  -- If both liked, create match notifications
  If NEW.action = 'like' AND partner_liked THEN
    -- Notify current user
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'match',
      'It''s a match! 💕',
      'You both love the name ' || NEW.name || '!',
      jsonb_build_object('name', NEW.name, 'partnership_id', NEW.partnership_id)
    );
    
    -- Notify partner
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      partner_user_id,
      'match',
      'It''s a match! 💕',
      'You both love the name ' || NEW.name || '!',
      jsonb_build_object('name', NEW.name, 'partnership_id', NEW.partnership_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for match checking
CREATE TRIGGER on_swipe_created
  AFTER INSERT ON user_swipes
  FOR EACH ROW EXECUTE PROCEDURE check_for_matches();

-- Enable realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE partnerships;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE user_swipes;