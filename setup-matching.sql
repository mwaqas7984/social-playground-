-- Create matching tables for real user matching

-- Matching queue table
CREATE TABLE IF NOT EXISTS matching_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  vibe_tags TEXT[],
  mode TEXT NOT NULL,
  joined_at BIGINT NOT NULL,
  room_id TEXT, -- New column for waiting room system
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  user1_id TEXT NOT NULL,
  user2_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for matching tables
ALTER PUBLICATION supabase_realtime ADD TABLE matching_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_matching_queue_mode ON matching_queue(mode);
CREATE INDEX IF NOT EXISTS idx_matching_queue_joined_at ON matching_queue(joined_at);
CREATE INDEX IF NOT EXISTS idx_matching_queue_room_id ON matching_queue(room_id);
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_room_id ON matches(room_id);

-- Add room_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='matching_queue' AND column_name='room_id'
    ) THEN
        ALTER TABLE matching_queue ADD COLUMN room_id TEXT;
    END IF;
END $$;
