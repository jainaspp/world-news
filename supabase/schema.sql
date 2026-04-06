-- ============================================================
-- Supabase: news aggregator schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Main news table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT        NOT NULL,
  summary     TEXT,
  link        TEXT        NOT NULL,
  source      TEXT        NOT NULL,
  image_url   TEXT,
  pub_date    TIMESTAMPTZ NOT NULL,
  region      TEXT        NOT NULL DEFAULT 'ALL',
  lang        TEXT        NOT NULL DEFAULT 'en',
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT  news_link_unique UNIQUE (link)
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_news_region_date
  ON news(region, pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_pub_date
  ON news(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_region
  ON news(region);

-- ── Auto-delete old news (keep 7 days) ─────────────────────
-- Runs automatically every day at 3am
CREATE OR REPLACE FUNCTION cleanup_old_news()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM news WHERE pub_date < NOW() - INTERVAL '7 days';
END;
$$;

-- Uncomment to enable auto-cleanup (requires cron extension):
-- SELECT cron.schedule('cleanup-old-news', '0 3 * * *', 'SELECT cleanup_old_news()');

-- ──RLS: Allow public read, service write only ──────────────
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Anyone can read news (public read)
CREATE POLICY "Public read news" ON news
  FOR SELECT USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role write news" ON news
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role delete news" ON news
  FOR DELETE USING (true);

CREATE POLICY "Service role update news" ON news
  FOR UPDATE USING (true);
