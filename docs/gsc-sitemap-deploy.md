# Sitemap · GSC · Deploy（Architecture E）

## Sitemap

- Live: `https://world-news.xyz/sitemap.xml`（Cloudflare Pages Function，動態合併靜態殼＋可索引 AI 欄／專題／當年今日／地標）
- `robots.txt` 應指向同一 sitemap
- 空殼專題（未 `topicPublic`）唔入 sitemap；樓市未齊料時唔會出現

## Google Search Console

1. 確認 `world-news.xyz` 屬性已驗證（見 repo 既有 GSC meta／DNS）
2. **Sitemaps** → 提交／重新提交 `https://world-news.xyz/sitemap.xml`
3. 大改（例如當年今日日頁大量新增）後再按一次重新抓取
4. 檢查「已發現但未編入索引」時，對照 `noindex` 頁（薄導讀／未公開專題）屬預期

## Deploy

- 建置：`npm ci && npm run build`（產出 `dist/`）
- 手動：`npx wrangler pages deploy dist --project-name world-news`
- CI：push／PR 跑 lint＋typecheck＋test＋build（`.github/workflows/ci.yml`）
- 可選自動部署：`.github/workflows/deploy-pages.yml`（需 `CLOUDFLARE_API_TOKEN` ＋ `CLOUDFLARE_ACCOUNT_ID` secrets；只在 `main`）

## 驗收對照（A→E）

- 首頁：digest → 今日必讀 → 當年今日（預設收）→ 排行／卡；頂部主 nav **無** OTD／地標
- 四欄（懶人包／專題／OTD／地標）同一 `pack-shell` 主站語感
- 空專題（尤其樓市）唔壓首頁／索引主格
