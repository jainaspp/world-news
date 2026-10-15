# Sitemap · GSC · Deploy（Architecture E）

## Sitemap

- Live: `https://world-news.xyz/sitemap.xml` 是靜態檔 `public/sitemap.xml`，由 Pages 直接當 asset 送出。`functions/` 裡沒有 `sitemap.xml` route（Function 會蓋住同名靜態檔，而且 Worker CPU 超限是 Cloudflare `1102`，try/catch 救不了，GSC 會顯示「無法讀取」）。
- `robots.txt` 指向同一份 apex sitemap。
- 靜態檔包含主要入口、法律頁、數據頁、可索引當年今日與地標。略去 `/region/twn`、`/story/`、空的 `/digest/` 與 `/weekly/`。分析目錄與專題目錄在沒有可索引正文時不出現。
- 建置：`npm run sitemap`（`npm run build` 的 prerender 也會寫 `public/sitemap.xml` 和 `dist/sitemap.xml`）。
- 單篇導讀、懶人包、分析、日報、週報、已公開專題：發布寫入 index 時，若該次 env 設了 `SITEMAP_FILE`（Node 路徑，不要設在 Pages），`rememberIndexMany` 會呼叫 `writePublishedSitemap` 重寫該檔。寫完要再部署，GSC 才會看到新網址。Pages 上不要把 `/sitemap.xml` 放回 Function。
- 跟直播新聞板走的 `/today/日期/…` 不進靜態檔（`/today/` 目錄仍在）。要併入時把已通過門檻的 path 傳給 `renderPublishedSitemap`。
- 空殼專題（未 `topicPublic`）唔入 sitemap；樓市未齊料時唔會出現。

## Google Search Console

部署完成後，在 **apex** 資源 `https://world-news.xyz/`（不要在 www 或 `*.pages.dev` 再交一份）：

1. 先確認線上是靜態檔：`curl -sI https://world-news.xyz/sitemap.xml` 應為 **HTTP 200**，`content-type` 含 `xml`，不是 Worker `1102` 或 500。
2. **Sitemaps** → 刪除目前顯示「無法讀取」的 `sitemap.xml`。
3. 重新提交 `https://world-news.xyz/sitemap.xml`。
4. 大改（例如當年今日日頁或發布再生 sitemap）後再按一次重新抓取。
5. 「已發現但未編入索引」若是 `noindex` 頁（薄導讀／未公開專題）屬預期。

## Deploy

- 建置：`npm ci && npm run build`（產出 `dist/`，含 `dist/sitemap.xml`）
- 手動：`npx wrangler pages deploy dist --project-name world-news`
- CI：push／PR 跑 lint＋typecheck＋test＋build（`.github/workflows/ci.yml`）
- 自動部署：合併 `main` 後用 `npx wrangler pages deploy dist --project-name world-news`（需 `CLOUDFLARE_API_TOKEN`）；Pages 亦會跟 git 整合時自動建置

## 驗收對照（A→E）

- 首頁：digest → 今日必讀 → 當年今日（預設收）→ 排行／卡；頂部主 nav **無** OTD／地標
- 四欄（懶人包／專題／OTD／地標）同一 `pack-shell` 主站語感
- 空專題（尤其樓市）唔壓首頁／索引主格
