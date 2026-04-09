-- ═══════════════════════════════════════════════
--  news table + 優化索引 + 視圖 + RPC 函數
-- ═══════════════════════════════════════════════

-- 1. 強制執行 schema（每次重設）
DROP TABLE IF EXISTS news CASCADE;
DROP VIEW IF EXISTS news_hkg CASCADE;
DROP VIEW IF EXISTS news_other CASCADE;
DROP VIEW IF EXISTS news_global CASCADE;
DROP FUNCTION IF EXISTS get_news_by_category(text) CASCADE;
DROP FUNCTION IF EXISTS get_news_hkg() CASCADE;
DROP FUNCTION IF EXISTS get_news_other() CASCADE;
DROP FUNCTION IF EXISTS get_news_all(integer) CASCADE;

-- 2. 建表
CREATE TABLE news (
  id          TEXT        PRIMARY KEY,
  title       TEXT        NOT NULL DEFAULT '',
  summary     TEXT        NOT NULL DEFAULT '',
  link        TEXT        NOT NULL DEFAULT '',
  source      TEXT        NOT NULL DEFAULT '',
  pub_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  image_url   TEXT        NOT NULL DEFAULT '',
  region      TEXT        NOT NULL DEFAULT 'ALL',
  is_bookmark BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 核心索引（加速所有常見查詢）
CREATE INDEX news_pub_date_idx      ON news (pub_date DESC);           -- 最新優先
CREATE INDEX news_region_idx         ON news (region);                    -- region 過濾
CREATE INDEX news_source_idx         ON news (source);                   -- source 過濾
CREATE INDEX news_pub_region_idx    ON news (pub_date DESC, region);    -- 組合查詢
CREATE INDEX news_image_url_idx      ON news (image_url)                 -- 有圖過濾
  WHERE image_url != '';

-- 4. 全文搜索索引（香港關鍵詞）
CREATE INDEX news_title_hkg_idx ON news USING gin (
  to_tsvector('simple', title || ' ' || COALESCE(summary, ''))
);

-- ═══════════════════════════════════════════════
--  RPC 函數：直接在 DB 端過濾，極速返回
-- ═══════════════════════════════════════════════

-- 全球新聞（只看有圖，最多 N 條，按 title 去重）
CREATE OR REPLACE FUNCTION get_news_all(lim integer DEFAULT 50)
RETURNS SETOF news
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (title) *
  FROM   news
  WHERE  image_url != ''
  ORDER BY title, pub_date DESC
  LIMIT  lim;
END;
$$;

-- 香港新聞（按 title 去重）
CREATE OR REPLACE FUNCTION get_news_hkg()
RETURNS SETOF news
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (title) *
  FROM   news
  WHERE  title ILIKE '%Hong Kong%'
      OR title ILIKE '%香港%'
      OR title ILIKE '%HK %'
      OR title ILIKE '%rthk%'
      OR title ILIKE '%hkfp%'
      OR title ILIKE '%852%'
      OR title ILIKE '%明報%'
      OR title ILIKE '%立場%'
      OR title ILIKE '%港聞%'
      OR title ILIKE '%港股%'
  ORDER BY title, pub_date DESC
  LIMIT 100;
END;
$$;

-- 其他新聞（排除香港關鍵詞，按 title 去重）
CREATE OR REPLACE FUNCTION get_news_other()
RETURNS SETOF news
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (title) *
  FROM   news
  WHERE  title NOT ILIKE '%Hong Kong%'
    AND title NOT ILIKE '%香港%'
    AND title NOT ILIKE '%HK %'
    AND title NOT ILIKE '%rthk%'
    AND title NOT ILIKE '%hkfp%'
    AND title NOT ILIKE '%852%'
    AND title NOT ILIKE '%明報%'
    AND title NOT ILIKE '%立場%'
    AND title NOT ILIKE '%港聞%'
    AND title NOT ILIKE '%港股%'
  ORDER BY title, pub_date DESC
  LIMIT 100;
END;
$$;

-- 通用分類查詢（用 text 參數）
CREATE OR REPLACE FUNCTION get_news_by_category(category text)
RETURNS SETOF news
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF category = 'ALL' THEN
    RETURN QUERY SELECT * FROM news WHERE image_url != '' ORDER BY pub_date DESC LIMIT 50;
  ELSIF category = 'HKG' THEN
    RETURN QUERY SELECT * FROM news WHERE title ILIKE '%香港%' OR title ILIKE '%rthk%' OR title ILIKE '%hkfp%' ORDER BY pub_date DESC LIMIT 100;
  ELSE
    RETURN QUERY SELECT * FROM news WHERE title NOT ILIKE '%香港%' AND title NOT ILIKE '%rthk%' ORDER BY pub_date DESC LIMIT 100;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════
--  Row Level Security
-- ═══════════════════════════════════════════════
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON news
  FOR SELECT USING (true);

CREATE POLICY "service_write" ON news
  FOR INSERT WITH CHECK (true);

-- 啟用 Realtime（可選）
ALTER PUBLICATION supabase_realtime ADD TABLE news;
