-- Cursore di pull lato server: istante in cui il Worker ha accettato la riga.
ALTER TABLE teams ADD COLUMN server_updated_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN server_updated_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE opponents ADD COLUMN server_updated_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN server_updated_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN server_updated_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_teams_server_updated ON teams(server_updated_at);
CREATE INDEX IF NOT EXISTS idx_players_server_updated ON players(server_updated_at);
CREATE INDEX IF NOT EXISTS idx_opponents_server_updated ON opponents(server_updated_at);
CREATE INDEX IF NOT EXISTS idx_games_server_updated ON games(server_updated_at);
CREATE INDEX IF NOT EXISTS idx_events_server_updated ON events(server_updated_at);
