-- Create necessary tables for Social Playground

-- Messages table for chat
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game states table
CREATE TABLE IF NOT EXISTS game_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  state JSONB NOT NULL,
  current_player TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity events table
CREATE TABLE IF NOT EXISTS activity_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  user_id TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table for safety
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  reported_user_id TEXT,
  reason TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE game_states;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_events;
ALTER PUBLICATION supabase_realtime ADD TABLE reports;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_game_states_room_id ON game_states(room_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_room_id ON activity_events(room_id);
CREATE INDEX IF NOT EXISTS idx_reports_room_id ON reports(room_id);
