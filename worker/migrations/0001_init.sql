CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  color TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_teams_updated ON teams(updated_at);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  number INTEGER NOT NULL,
  role TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  photo_url TEXT,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_players_updated ON players(updated_at);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);

CREATE TABLE IF NOT EXISTS opponents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  roster TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_opponents_updated ON opponents(updated_at);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  opponent_id TEXT NOT NULL,
  date TEXT NOT NULL,
  home INTEGER NOT NULL DEFAULT 1,
  competition TEXT,
  venue TEXT,
  status TEXT NOT NULL,
  use_clock INTEGER NOT NULL DEFAULT 0,
  period_length_min INTEGER NOT NULL DEFAULT 10,
  periods_regulation INTEGER NOT NULL DEFAULT 4,
  current_period INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'MANUAL',
  ics_uid TEXT,
  starters TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_games_updated ON games(updated_at);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  period INTEGER NOT NULL,
  clock_sec INTEGER,
  side TEXT NOT NULL,
  type TEXT NOT NULL,
  player_id TEXT,
  jersey_number INTEGER,
  x REAL,
  y REAL,
  made INTEGER,
  assist_player_id TEXT,
  foul_kind TEXT,
  sub_in_player_id TEXT,
  sub_out_player_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_events_game_seq ON events(game_id, seq);
CREATE INDEX IF NOT EXISTS idx_events_updated ON events(updated_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_at ON login_attempts(ip, at);
