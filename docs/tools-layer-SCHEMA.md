# `/tools/` 書面實用層（P1 預備）

**狀態：** 只預備，不硬合併。本文件與 `/tools/` 草稿索引可以整段刪掉。
**時點：** 2026-10-19。AdSense 覆核窗約 2026-10-22 有結果、而且軟橋點擊可讀之前，不寫工具正文。
**主軸：** world-news.xyz 握敘事、canonical、書面語與審核面。JD Tech 維持 IG 與登陸頁，作取得注意的殼，不收進新聞刊頭。

懶人包頁尾的一張教學卡仍由 [`soft-bridge-SCHEMA.md`](./soft-bridge-SCHEMA.md) 規定。那份契約不新增可索引路由。本頁只補日後 `/tools/<slug>/` 的寫法，以及現在這一頁可撤回的草稿索引。

## 現在這一頁

路徑只有 `/tools/`。沒有 `/tools/<slug>/`。

| 項 | 規定 |
|----|------|
| 索引 | `<meta name="robots" content="noindex, follow">`，回應頭 `x-robots-tag: noindex, follow` |
| 網站地圖 | `blockedSitemapLoc` 拒收 `/tools` 與 `/tools/` 之下的路徑。要進索引時，須在另一次變更裡同時拿掉 noindex、通過正文門檻，並改這道拒收 |
| 廣告 | 不輸出廣告單元，不載入 `pagead`。不因本頁打開 Auto ads |
| 入口 | 不進刊頭、頁尾、首頁。知道網址才能打開 |
| 清單 | 只列 `shared/softBridgePairs.ts` 的同題伴頁，一筆一項 |
| 連結 | 站內文字連結到對應懶人包；站外文字連結到該筆 `jdUrl`，不加查詢字串，不新造 UTM |
| 子路徑 | 未建立的 `/tools/<slug>/` 沿用全站 404。404 已是 noindex。本變更不新增子路由 |

草稿索引不複製 JD 頁面，不列出 2026-10-17 的七張短片卡，也不出現 `/reels/`。兩筆伴頁若指向同一則原站工具說明，仍分列，不收成工具樹。

未知路徑、密碼庫、休閒技巧、政府表格、租樓程序、Gumroad 結帳，都不在這頁。

## 日後 `/tools/<slug>/`

閘門須同時成立，才寫正文：

1. AdSense 覆核窗有結果，並記入站內廣告政策旁。
2. 軟橋點擊可讀，而且沒有把工具流灌進首頁或地區頁。
3. 帳戶沒有因 JD 薄頁或密碼閘腳本而起的政策警告。

第一批只新寫三篇。每篇對齊近層之一：語音影像、可核對記錄、知識傳播。對不上就不寫。slug 到那時才定，本預備不預建網址。

| 項 | 規定 |
|----|------|
| 語域 | 書面中文。粵語只留在 JD 的短片與原站說明，不複製進正文 |
| 篇幅 | 一篇一個主題。不搬 JD 全文，避免兩個 canonical |
| 廣告 | 即使新聞站已過審，試點頁仍是零廣告、零 `pagead`。第一批廣告仍只放原有達標新聞頁 |
| 舊址 | github.io 對應頁維持原 canonical。不對舊網址做 301 |
| 入口 | 只從對得上的技術軸末端、今日切片或懶人包卡進入。對不上不渲染 |
| 禁掛 | 薄頁、noindex、文明軸正文不掛卡，也不掛廣告 |

`/jd/` 作為短別名再 301，是更後面的終態偏好。本預備不做。子域 `tools.` 與 `jd.world-news.xyz` 不採用。頂層 `/reels/` 鏡像不在這一步，也不是預設。

## 廣告與審核

新聞站覆核期維持 `ADS_REVIEW_HOLD`。本頁不讀廣告客戶編號，不輸出 `<ins class="adsbygoogle">`。Auto ads、穿插式廣告與錨點廣告是 AdSense 後台開關，倉庫改不到；本變更也不要求把它們打開。

草稿索引用 noindex，不用 `robots.txt` 的 `Disallow`。爬蟲可以讀到 noindex。`Mediapartners-Google` 的既有 `Allow: /` 不動。

## 明確不做

- 不改 DNS，不做 Cloudflare 反代，不把 JD 收進網站地圖。
- 不做大量 301，不把整站路徑搬進新聞站。
- 不鏡像 `/reels/`，不鏡像 JD 工具樹，不複製懶人包或短片全文。
- 不把 `/workflow/` 密碼庫、薄落地頁、Gumroad 結帳搬進來。
- 不合併兩邊 AdSense 物業，不在本頁開 Auto ads。
- 不改 IG 簡介，不做品牌改名，不改刊頭語氣。
- 不寫台灣議題，不寫敏感政治，不拿地方互相對照。
- 不自動配對。伴頁仍須人工確認後才出現在 `softBridgePairs.ts`。

## 撤回

刪除下面檔案即可，懶人包頁尾的教學卡不受影響：

- `functions/tools/index.ts`
- `shared/toolsDraft.ts`
- `tests/toolsDraft.test.ts`
- `shared/sitemap.ts` 裡對 `/tools` 的拒收
- 本文件

IG 與 JD 登陸頁從未以這一頁為出口。
