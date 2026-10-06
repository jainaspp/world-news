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

不要再部署這個 repo 裡已刪除的 Cloudflare Worker。請在 Cloudflare 控制台刪掉舊的 Worker，舊金鑰還在已部署的程式裡。

GitHub Pages 已停用。Vercel 是唯一網站。

## 本地開發

```bash
npm install
npm run dev
```

`npm test`、`npm run lint`、`npm run typecheck`、`npm run build` 會在 GitHub Actions 跑。

## 抓取

Vercel Cron 每日 08:00 UTC 呼叫 `GET /api/crawl`。同一條連結會覆寫，不會重複插入。沒有 `CRON_SECRET` 時這個網址一律回 401，程式裡沒有預設密碼。

頁面本身每數分鐘向 `/api/news` 取一次 RSS，所以即使還沒填 Supabase，網站仍然有標題。
