# 安全

請把問題寄到 `jainaspp@gmail.com`，不要公開貼出金鑰。

瀏覽器只可以呼叫 `/api/news`。Supabase 的網址同 service role key 只從伺服器環境變數讀取：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`。

`/api/crawl` 只接受 `Authorization: Bearer` 加上環境變數 `CRON_SECRET`。沒有設定這個變數就會拒絕。

資料庫請執行 `supabase/migrations/20261006120000_news_public_read.sql`。匿名金鑰只有讀取權。舊的公開寫入政策會被拿掉。

這個 git 歷史仍然包含已輪換前的金鑰。輪換完成之後，舊值就不能用。不要把新金鑰寫回原始碼、`.env` 或 `.gitignore`。
