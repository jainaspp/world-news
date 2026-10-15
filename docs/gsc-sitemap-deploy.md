# Sitemap · GSC · Deploy（Architecture E）

## Sitemap

- Live: `https://world-news.xyz/sitemap.xml`（Cloudflare Pages Function，動態合併靜態殼＋可索引 AI 欄／專題／當年今日／地標）
- `robots.txt` 應指向同一 sitemap
- 空殼專題（未 `topicPublic`）唔入 sitemap；樓市未齊料時唔會出現
- 任何 KV 逾時、綁定缺失或未捕捉例外都回 **HTTP 200** 的 XML：優先交已讀到的靜態殼，否則只交首頁 `<urlset>`。唔再交 5xx（Cloudflare `1102`／500 會令 GSC 顯示「無法讀取」）
- 每類欄目只檢查最新 80 筆正文，分批讀取；當日路徑用有上限的聚類。成功時仍略去 `/region/twn`、薄導讀殼

## Google Search Console

1. 確認 `world-news.xyz` 屬性已驗證（見 repo 既有 GSC meta／DNS）
2. **只在 apex 資源**提交。www 會 301 到 apex，不要在 www 資源再交一份
3. 若狀態仍是「無法讀取／無法擷取」：刪除舊的 `sitemap.xml` 項目，再提交 `sitemap.xml`（`https://world-news.xyz/sitemap.xml`）
4. 大改（例如當年今日日頁大量新增）後再按一次重新抓取
5. 檢查「已發現但未編入索引」時，對照 `noindex` 頁（薄導讀／未公開專題）屬預期

## Deploy

- 建置：`npm ci && npm run build`（產出 `dist/`）
- 手動：`npx wrangler pages deploy dist --project-name world-news`
- CI：push／PR 跑 lint＋typecheck＋test＋build（`.github/workflows/ci.yml`）
- 自動部署：合併 `main` 後用 `npx wrangler pages deploy dist --project-name world-news`（需 `CLOUDFLARE_API_TOKEN`）；Pages 亦會跟 git 整合時自動建置

## 驗收對照（A→E）

- 首頁：digest → 今日必讀 → 當年今日（預設收）→ 排行／卡；頂部主 nav **無** OTD／地標
- 四欄（懶人包／專題／OTD／地標）同一 `pack-shell` 主站語感
- 空專題（尤其樓市）唔壓首頁／索引主格
