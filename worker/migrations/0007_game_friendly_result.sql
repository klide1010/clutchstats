-- Amichevole (non conta in stagione) e risultato inserito a mano ("solo risultato", senza statistiche).
ALTER TABLE games ADD COLUMN friendly INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN score_us INTEGER;
ALTER TABLE games ADD COLUMN score_them INTEGER;
