# 世界頭條

公開 RSS 標題板。網頁只顯示標題、來源名稱同原文連結，不轉載內文，亦不會把資料庫金鑰送到瀏覽器。

沒有設定任何環境變數都可以運作：伺服器直接讀公開 RSS。設定下面三個變數之後，每日排程會把同一批標題存進 Supabase，來源暫時失敗時可以回退。

正式網站：https://world-news.xyz

`world-news-tawny.vercel.app` 會 301 轉到 `https://world-news.xyz`。

## 擁有人要在 Vercel 設定的環境變數

到 Vercel → Project → Settings → Environment Variables。金鑰輪換完成後先填新值，再重新部署。

| 名稱 | 必填？ | 填什麼 |
| --- | --- | --- |
| `SUPABASE_URL` | 要用備份儲存才需要 | Supabase 專案的 URL，例如 `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | 要用備份儲存才需要 | Supabase 的 service role key。只放在伺服器，不要加 `VITE_` 字首 |
| `CRON_SECRET` | 要用每日抓取才需要 | 自己定一組長密碼。Vercel Cron 會用 `Authorization: Bearer <CRON_SECRET>` 呼叫 `/api/crawl` |
| `VITE_SITE_URL` | 否 | 分享連結用。預設 `https://world-news.xyz` |
| `VITE_AD_SLOT_TOP` | 否 | 窄螢幕時頭條上方的橫額；1200px 以上改放側欄 300×600，不會黏住畫面。留空就不會畫出空白廣告框 |
| `VITE_AD_SLOT_FEED` | 否 | 每 8 則頭條插入一次的資訊流版位 ID。收藏頁不會顯示。留空就不會畫出空白廣告框 |

`index.html` 仍會載入 AdSense（`ca-pub-8392975944327076`）。兩個版位都留空時，手動廣告不會出現，自動廣告仍可以由這個 loader 投放。`VITE_GOOGLE_AD_CLIENT` 可選，預設就是這個發布商 ID，要跟 loader 上的 `client` 相同。

`/ads.txt` 由 `public/ads.txt` 以純文字提供，內容是 `google.com, pub-8392975944327076, DIRECT, f08c47fec0942fa0`。專案目前沒有 Content-Security-Policy。如果之後加上，要允許 `pagead2.googlesyndication.com`、`googleads.g.doubleclick.net`、`tpc.googlesyndication.com` 同 `adservice.google.com`。

Supabase SQL Editor 要先執行一次：

`supabase/migrations/20261006120000_news_public_read.sql`

這份 SQL 不會刪表。匿名用戶只能讀。寫入只會由伺服器上的 service role key 做，因為它不受列權限限制。

舊的 Cloudflare Worker 已經從這個 repo 刪掉，請在 Cloudflare 控制台刪掉那個舊 Worker。新的部署是 Cloudflare Pages，見下面一節，不會把舊金鑰帶回去。

GitHub Pages 已停用。Vercel 繼續服務，直到 DNS 改指向 Cloudflare Pages。

## 本地開發

```bash
npm install
npm run dev
```

`npm test`、`npm run lint`、`npm run typecheck`、`npm run build` 會在 GitHub Actions 跑。

## 抓取

Vercel Cron 每日 08:00 UTC 呼叫 `GET /api/crawl`。同一條連結會覆寫，不會重複插入。沒有 `CRON_SECRET` 時這個網址一律回 401，程式裡沒有預設密碼。

頁面本身每數分鐘向 `/api/news` 取一次 RSS，所以即使還沒填 Supabase，網站仍然有標題。

## Cloudflare Pages

跟 Vercel 共用 `server/` 的 RSS、分類同 Supabase 邏輯。`functions/api/news.ts` 同 `functions/api/crawl.ts` 只負責 Workers 的請求同 Cache API。`/api/news` 回應 `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`，並且寫入 Cache API。300 秒內直接回快取；300 到 900 秒回舊內容並在背景更新。

Pages 專案設定：

| 項目 | 值 |
| --- | --- |
| 建置指令 | `npm run build` |
| 輸出目錄 | `dist` |
| 部署 | `npx wrangler pages deploy dist --project-name world-news` |

`wrangler.toml` 的 `name` 是 `world-news`，`pages_build_output_dir` 是 `dist`。本地先建置再跑 `npx wrangler pages dev dist`。

環境變數同 Vercel 那張表，都是可選。另外：

| 名稱 | 必填？ | 填什麼 |
| --- | --- | --- |
| `REDIRECT_PAGES_DEV` | 否 | 留空。自訂網域 `world-news.xyz` 已經接上、可以切 DNS 之後，才設成 `true`。設了之後，`*.pages.dev` 會 301 到 `https://world-news.xyz`（路徑同 query 保留）。未設定時預覽網址同 `wrangler pages dev` 不會被轉走 |

`public/_redirects` 只把 `/region/:code` 同 `/category/:slug` 以 200 rewrite 交回 `/`（Pages 會用 `index.html` 回應，但不能直接寫去 `/index.html`，否則會被轉成 308）。沒有全站 SPA fallback，所以 `/ads.txt`、`/sitemap.xml`、`/robots.txt`、`/api/*` 不會被吞掉。其他未知路徑用 `public/404.html`。`*.pages.dev` 的 301 不能寫在 `_redirects`（那裡不能按 host 開關），所以放在 `functions/_middleware.ts`，由 `REDIRECT_PAGES_DEV` 控制。

`public/_headers` 把 `/ads.txt` 標成 `text/plain`，全站加上安全標頭，`/assets/*`（Vite 帶 hash 的檔）快取一年。

`/api/crawl` 的授權同 Vercel：`Authorization: Bearer <CRON_SECRET>`。Pages 這個設定檔沒有內建 cron。DNS 轉過去之前，每日抓取仍由 Vercel Cron 負責。轉過去之後，用同一個網址同一組密碼，每日由排程打一次即可。

## AI 日報、分析、週報

`/digest/`、`/analysis/<slug>/`、`/weekly/` 由 Pages Functions 出 HTML（有 canonical、NewsArticle / Article JSON-LD）。文字用 Workers AI 模型 `@cf/qwen/qwen3-30b-a3b-fp8`，只根據 RSS 標題同短描述，頁面標明「AI 整合」。模型失敗或當日額度用完時，會保留上一份 AI 稿。未有 AI 稿就快取來源標題稿，頁面不會回 500，之後的訪客也不用再等模型。

讀頁的人不會等模型。第一個請求先看到來源稿，`waitUntil` 在背景寫入；GitHub Actions 會在早上同傍晚先打生成網址，所以正式讀者多數直接看到已寫好的稿。

`wrangler.toml` 已有 `[ai] binding = "AI"`。KV 綁定 `CONTENT` 先註解住。未建立 KV 時，結果存在 Cache API。要持久保存：

```bash
npx wrangler kv namespace create CONTENT
```

把回傳的 id 寫進 `wrangler.toml` 的 `[[kv_namespaces]]`。

| 名稱 | 放哪裡 | 填什麼 |
| --- | --- | --- |
| `GENERATE_SECRET` | Pages 環境變數，同 GitHub Actions secret | 自訂長密碼。`POST /api/generate` 要帶 header `x-generate-secret`。公開閱讀唔使密碼 |
| `CONTENT_SITE_URL` | GitHub Actions variable，可選 | 預設 `https://world-news.xyz`。DNS 未轉之前可填 `https://world-news-b5e.pages.dev` |

模型定價（Cloudflare 公開價）：輸入每百萬 token 4,625 neurons，輸出每百萬 token 30,475 neurons。以每日 2 篇日報、最多 8 篇分析、週報攤分計，大約 300 neurons，低過免費額度 10,000 neurons。程式每日最多叫模型 12 次。

`[ai]` 綁定只能走遠端。`npx wrangler pages dev dist` 因此需要環境變數 `CLOUDFLARE_API_TOKEN`（權限要有 Workers AI）。沒有 token 時，先把 `wrangler.toml` 的 `[ai]` 三段註解掉，頁面會用來源標題稿，不會叫模型。
