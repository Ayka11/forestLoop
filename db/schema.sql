-- Persistent player profiles table
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(32) UNIQUE NOT NULL,
  total_runs INT DEFAULT 0,
  total_distance BIGINT DEFAULT 0,
  total_tokens BIGINT DEFAULT 0,
  favorite_character VARCHAR(32),
  join_date TIMESTAMP DEFAULT NOW(),
  profile_badge VARCHAR(32),
  achievements_unlocked INT DEFAULT 0
);

-- Multiplayer lobby table
CREATE TABLE game_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(8) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(16) DEFAULT 'waiting',
  max_players INT DEFAULT 4
);

-- Lobby players table
CREATE TABLE lobby_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID REFERENCES game_lobbies(id),
  player_id UUID REFERENCES game_players(id),
  avatar VARCHAR(32),
  is_ready BOOLEAN DEFAULT FALSE,
  join_time TIMESTAMP DEFAULT NOW()
);

-- Real-time game state table
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID REFERENCES game_lobbies(id),
  state JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);
