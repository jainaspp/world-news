# 文明編年數據庫

文本優先。頁面讀這份種子，不讀階段軸、卷次跳轉或刻度導覽。架構重搭等正文夠厚再談。

## 表

| 表 | 內容 |
|----|------|
| `threads` | 一卷長文：宇宙、銀河、地球、起源、編年、技術、城市、展望 |
| `entries` | 卷內按 `sort_key` 排列的段落。`body` 為 Markdown。`also_id` 是同一節的第二個錨 |
| `sources` | 既有出處。不新造來源 |
| `meta` | `version`、`generated_at`，以及各卷改寫前後的漢字數 |

## 現在怎麼讀

`shared/civilization/db/seed.json` 是運行時真源。`shared/civilization/db/render.ts` 把它渲染成普通文章。`seed.sql` 是同一份種子的 SQL，供日後灌進 D1。

重新生成（只在改寫作曲器之後）：

```bash
npx vite-node scripts/write-chronicle-db.ts
```

## 日後接上 D1

此環境沒有 Cloudflare 帳號，也沒有新的密鑰。綁定由人工加上，不要在這個檔案裡填假的 `database_id`。

```bash
npx wrangler d1 create world-news-chronicle
npx wrangler d1 execute world-news-chronicle --remote --file=migrations/0001_chronicle.sql
npx wrangler d1 execute world-news-chronicle --remote --file=shared/civilization/db/seed.sql
```

然後在 `wrangler.toml` 取消註解並填上剛建立的 id：

```toml
[[d1_databases]]
binding = "CHRONICLE_DB"
database_name = "world-news-chronicle"
database_id = "<wrangler d1 create 印出的 id>"
```

`readThreads()` 在傳入 D1 時改走 SQL；不傳則讀種子。目前頁面函式仍是同步的，所以線上仍讀種子，直到綁定接上並把路由改成非同步查詢。
