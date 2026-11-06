-- Chronicle content database. Text first; no axis, stage-grid, or volume-jump tables.
-- Create (once a Cloudflare account is attached; no secret is required by this file):
--   npx wrangler d1 create world-news-chronicle
-- Apply:
--   npx wrangler d1 execute world-news-chronicle --remote --file=migrations/0001_chronicle.sql
--   npx wrangler d1 execute world-news-chronicle --remote --file=shared/civilization/db/seed.sql
-- Until the CHRONICLE_DB binding is uncommented in wrangler.toml, pages read shared/civilization/db/seed.json.

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  lede TEXT NOT NULL,
  sort_key INTEGER NOT NULL,
  path TEXT NOT NULL,
  ai_note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  sort_key INTEGER NOT NULL,
  time_label TEXT NOT NULL,
  parent_slug TEXT,
  also_id TEXT,
  UNIQUE (thread_id, slug)
);

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY,
  thread_id TEXT NOT NULL,
  entry_slug TEXT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS entries_thread_sort ON entries (thread_id, sort_key);
CREATE INDEX IF NOT EXISTS sources_thread ON sources (thread_id);
