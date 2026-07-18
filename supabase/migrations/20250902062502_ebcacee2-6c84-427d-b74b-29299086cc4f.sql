-- Fix security warnings by adding proper search_path to functions
CREATE OR REPLACE FUNCTION calculate_user_similarities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  other_user_record RECORD;
  common_likes INTEGER;
  user1_total INTEGER;
  user2_total INTEGER;
  jaccard_similarity DECIMAL(5,4);
BEGIN
  -- Clear existing similarities
  DELETE FROM public.user_similarities;
  
  -- Calculate similarities between all user pairs
  FOR user_record IN 
    SELECT DISTINCT user_id FROM public.user_swipes WHERE action = 'like'
  LOOP
    FOR other_user_record IN 
      SELECT DISTINCT user_id FROM public.user_swipes 
      WHERE action = 'like' AND user_id > user_record.user_id
    LOOP
      -- Count common likes
      SELECT COUNT(*) INTO common_likes
      FROM public.user_swipes u1
      JOIN public.user_swipes u2 ON u1.name = u2.name
      WHERE u1.user_id = user_record.user_id 
        AND u2.user_id = other_user_record.user_id
        AND u1.action = 'like' 
        AND u2.action = 'like';
      
      -- Count total likes for each user
      SELECT COUNT(*) INTO user1_total
      FROM public.user_swipes
      WHERE user_id = user_record.user_id AND action = 'like';
      
      SELECT COUNT(*) INTO user2_total
      FROM public.user_swipes
      WHERE user_id = other_user_record.user_id AND action = 'like';
      
      -- Calculate Jaccard similarity (common / union)
      IF (user1_total + user2_total - common_likes) > 0 THEN
        jaccard_similarity := common_likes::DECIMAL / (user1_total + user2_total - common_likes);
      ELSE
        jaccard_similarity := 0;
      END IF;
      
      -- Only store if there's some similarity
      IF common_likes > 0 THEN
        INSERT INTO public.user_similarities (
          user1_id, user2_id, similarity_score, common_likes_count, 
          total_user1_likes, total_user2_likes
        ) VALUES (
          user_record.user_id, other_user_record.user_id, jaccard_similarity,
          common_likes, user1_total, user2_total
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Fix security warnings by adding proper search_path to functions
CREATE OR REPLACE FUNCTION calculate_name_similarities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  name_record RECORD;
  other_name_record RECORD;
  co_occurrence INTEGER;
  name1_users INTEGER;
  name2_users INTEGER;
  jaccard_similarity DECIMAL(5,4);
BEGIN
  -- Clear existing similarities
  DELETE FROM public.name_similarities;
  
  -- Calculate similarities between all name pairs
  FOR name_record IN 
    SELECT DISTINCT name FROM public.user_swipes WHERE action = 'like'
  LOOP
    FOR other_name_record IN 
      SELECT DISTINCT name FROM public.user_swipes 
      WHERE action = 'like' AND name > name_record.name
    LOOP
      -- Count users who liked both names
      SELECT COUNT(DISTINCT u1.user_id) INTO co_occurrence
      FROM public.user_swipes u1
      JOIN public.user_swipes u2 ON u1.user_id = u2.user_id
      WHERE u1.name = name_record.name 
        AND u2.name = other_name_record.name
        AND u1.action = 'like' 
        AND u2.action = 'like';
      
      -- Count total users who liked each name
      SELECT COUNT(DISTINCT user_id) INTO name1_users
      FROM public.user_swipes
      WHERE name = name_record.name AND action = 'like';
      
      SELECT COUNT(DISTINCT user_id) INTO name2_users
      FROM public.user_swipes
      WHERE name = other_name_record.name AND action = 'like';
      
      -- Calculate Jaccard similarity
      IF (name1_users + name2_users - co_occurrence) > 0 THEN
        jaccard_similarity := co_occurrence::DECIMAL / (name1_users + name2_users - co_occurrence);
      ELSE
        jaccard_similarity := 0;
      END IF;
      
      -- Only store if there's some co-occurrence
      IF co_occurrence > 0 THEN
        INSERT INTO public.name_similarities (
          name1, name2, similarity_score, co_occurrence_count
        ) VALUES (
          name_record.name, other_name_record.name, jaccard_similarity, co_occurrence
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;