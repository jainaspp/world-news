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
| `VITE_AD_SLOT_TOP` | 否 | 1200px 以上，標題熱詞下面的側欄 300×600（`.ad-slot-sidebar`）。不會放在 hero 前面，亦不會黏住畫面底部（安裝提示先佔底部）。留空仍保留灰色「支持世界頭條」框 |
| `VITE_AD_SLOT_FEED` | 否 | 每 8 則標準卡片之後的資訊流版位（`.ad-slot-feed`，min-height 280）。不會放在 hero 前面。收藏頁不會顯示。留空仍保留灰色框，不會收起 |

`index.html` 仍會載入 AdSense（`ca-pub-8392975944327076`）。版位 ID 留空時，手動 `<ins>` 不會畫出，灰色佔位「支持世界頭條」仍然留在版面，不會收起。自動廣告仍可以由這個 loader 投放。`VITE_GOOGLE_AD_CLIENT` 可選，預設就是這個發布商 ID，要跟 loader 上的 `client` 相同。

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

正式部署仍然是上面那一行，沒有改指令。新增的頁面同 API 都由 Pages Functions 提供，不用額外設定：

| 路徑 | 資料 | 邊緣快取 |
| --- | --- | --- |
| `/major/` | 24 小時重大更新時間線（讀 KV `board:signals`） | 約 3 分鐘 |
| `/api/major` | 最近約 3 小時的重大更新橫額（同一份 KV） | 約 3 分鐘 |
| `/api/clusters` | 多角度報道分組（唔放入 `/api/news`，讀 KV） | 約 5 分鐘 |
| `/api/board` | 背景重算分組同重大更新，寫入 KV。新鮮 10 分鐘內直接回，唔再聚類 | 約 5 分鐘 |
| `/api/markets` | 美元/港元、人民幣/港元、金價、布倫特原油（Yahoo chart，唔使匙） | 約 10 分鐘 |
| `/api/alerts` | 天文台生效警告，同港鐵非綠色綫務（`ryg_line_status.xml`） | 約 5 分鐘 |
| `POST /api/reads` | 標題點擊，寫入 `CONTENT` KV（`reads:YYYY-MM-DD`，香港日期） | 不快取 |
| `/api/popular` | 今日熱門；點擊不足就用 KV 裡最新的多媒體報道 | 約 1 分鐘 |

`/api/news` 成功之後，同每日 crawl，會另起一次請求打 `POST /api/board`。聚類唔喺出頁面嗰次 CPU 入面做。KV 未有資料時，請求路徑最多只用最新 100 則標題做後備，唔會對成板做兩兩比較。`/api/news` 本身唔聚類。RSS 拆成 26 個小分片（每片最多 2 個來源），父請求只合併 JSON，避免一次解析多個 feed 超出 Workers CPU。分片數要留在 40 以下，先至唔會頂到 50 次 subrequest 上限。

分組用標題詞彙同實體對照，唔會為分組呼叫 Workers AI embedding。港鐵官方開放數據的 next-train 要指定路綫同車站，唔係全綫狀態；狀態用港鐵網站公開的紅黃綠 XML。XML 失敗就只顯示天文台警告。

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

## Grok 導讀同新聞懶人包

`/briefing/`、`/briefing/<slot>/`（`YYYY-MM-DD-am` 或 `pm`）和 `/explainer/`、`/explainer/<key>/` 都是可索引的 HTML，會寫進 `sitemap.xml`。正文少於 500 字、或未完成應有段落的導讀和懶人包會 `noindex`，不進列表和 sitemap。導讀用當日香港和內地標題（包括「歐中貿易談判」這類歸在財經、但內容是中國的報道），每日 07:30 和 18:30（香港時間）各一篇，並連到同日已發布的懶人包。新聞懶人包先收緊到同一事件（標題重疊、同一分類、數小時內），再由 Grok 剔走不是該事件的標題；每日最多 20 篇。標題用模型寫的中文，不拼接來源標題。文首三行重點，下面是事件時間線、事件經過；各方回應和後續關注沒有來源就不寫。舊網址 `/compare/` 會 301 到 `/explainer/`。導讀和懶人包用 xAI `grok-4.3` 的 Responses API，並開啟 `web_search`（每次最多約 5 次搜尋、來源列表最多 10 條，排除社交網站）。Workers AI 只在本月 10 美元上限用盡，或 xAI 沒有回應時才用。

`/region/<code>/` 和 `/category/<slug>/` 在標題列表上方有一段「本週重點」（約 250 至 400 字，標明 AI 整合）。同一日只寫一次，跟導讀共用 10 美元上限。KV 未有這段時，頁面只顯示標題列表，不會報錯。

生成由 `.github/workflows/warm-content.yml` 分批呼叫 `POST /api/generate`（header `x-generate-secret`）。導讀、懶人包和本週重點只讀已快取的新聞板，不會在這次請求裡重抓 RSS。快取未有、或結果只是來源標題稿時，回應是 503 且 `fallback: true`，工作流程會再試。每批最多 3 篇。當日已經寫好、正文夠長的 Grok 稿不會重寫；未到 500 字的稿可以重寫。同一題過薄的稿每日最多再試兩次；工作流程若連續收到同一組 key 就停止。`force=1` 可覆寫指定導讀時段、尚未發布的懶人包，或本週重點。模型失敗會改用 Workers AI，再退回來源標題稿，不會令首頁 500。回應裡的 `cost`（導讀）和 `costs`（懶人包）是該篇的 token 加搜尋費用。

xAI 定價（`grok-4.3`，提示少於 20 萬 token）：輸入每百萬 token 1.25 美元，輸出每百萬 token 2.50 美元。推理 token 計入輸出。`web_search` 每次成功呼叫 0.005 美元（每千次 5 美元），次數讀回應裡的 `usage.server_side_tool_usage_details.web_search_calls`（否則用 `SERVER_SIDE_TOOL_WEB_SEARCH`）。搜尋費用加進同一個 10 美元月上限。用量按香港時間曆月存在 KV `xai-usage:YYYY-MM`（含 `searchCalls`）。當月累計達到 10 美元之後，新文章自動改走 Workers AI。`POST /api/generate?kind=status`（同樣要 `x-generate-secret`）回傳本月 token、搜尋次數、費用和篇數。

| 名稱 | 放哪裡 | 填什麼 |
| --- | --- | --- |
| `XAI_API_KEY` | Pages secret，`npx wrangler pages secret put XAI_API_KEY` | xAI API key。唔好寫入 repo，亦唔好放在 `VITE_` |
| `GENERATE_SECRET` | 已有的 Pages 變數同 GitHub Actions secret | 導讀、懶人包、status 用同一組密碼 |

KV 綁定 `CONTENT` 沿用現有 namespace，唔使再開一個。Workflow 唔使新 secret：key 只放在 Pages。

