-- Optional figures for real photographs and labeled schematics.
-- Apply only when a chronicle D1 database is attached. Pages keep reading the seed until then.
--   npx wrangler d1 execute world-news-chronicle --remote --file=migrations/0002_chronicle_figures.sql

CREATE TABLE IF NOT EXISTS figures (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  volume TEXT NOT NULL,
  near_entry TEXT NOT NULL,
  after_heading TEXT,
  embed INTEGER NOT NULL,
  src TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  caption_zh TEXT NOT NULL,
  source_org TEXT NOT NULL,
  title TEXT NOT NULL,
  license TEXT NOT NULL,
  source_url TEXT NOT NULL,
  retrieved TEXT NOT NULL,
  credit TEXT NOT NULL,
  alt_zh TEXT NOT NULL,
  not_ai INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS figures_volume_entry ON figures (volume, near_entry);
