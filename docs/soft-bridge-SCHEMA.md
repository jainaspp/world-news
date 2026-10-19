# 軟橋契約（P0）

新聞站是主軸。本頁只規定懶人包頁尾的一張教學卡。不新增可索引的 `/tools/<slug>/` 正文，也不新增 `/reels/` 路由，不改域名，不改廣告開關。`/tools/` 若出現，只可以是 [`tools-layer-SCHEMA.md`](./tools-layer-SCHEMA.md) 所寫的 noindex 草稿索引，而且不進網站地圖。

資料在 `shared/softBridgePairs.ts`。每週追加一筆即可，渲染器不用另開分支。

## 同題伴頁欄位

| 欄位 | 含義 |
|------|------|
| `slug` | 伴頁編號。本週已鎖定的兩筆不可改指向 |
| `explainerKey` | 懶人包 key，對應 `/explainer/<key>/` |
| `lazyPackUrl` | 世界頭條懶人包網址 |
| `jdUrl` | JD Tech 工具頁或 Reel 頁，不含查詢字串 |
| `utmTerm` | Concept B 的 `utm_term` |
| `cta` | 連結文字，書面中文 |
| `disclosure` | 連結下的說明，書面中文 |

一筆就是一組同題伴頁：懶人包網址 × JD 工具或 Reel 網址 × `slug`。

## UTM（Concept B）

| 參數 | 值 |
|------|----|
| `utm_source` | `worldnews` |
| `utm_medium` | `referral` |
| `utm_campaign` | `toolcard` |
| `utm_content` | `card-footer` |
| `utm_term` | 該筆的 `utmTerm` |

已否決的寫法不再使用：`utm_campaign=mustread_tool`、`utm_source=world-news`。

## 編輯

- 世界頭條卡面用書面中文。標籤是「教學：JD Tech」。粵語留在 JD 的短片與工具說明頁。
- 一則懶人包頁尾至多一張卡，放在來源列表之上。
- 文明軸正文不掛卡。薄頁與 `noindex` 頁不掛卡。只有已達公開門檻的懶人包才渲染。
- JD 網址必須是已經公開的頁面。沒有對得上的已發布懶人包，就不追加。不虛構錄音網址。

## 本週三筆

| slug | 懶人包 | JD |
|------|--------|----|
| `reread-llamaparse-notebooklm` | `/explainer/2026-10-19-llamaparse-per-product-mcp-c15c091b4276/` | `/tools/notebooklm/`，`utm_term=notebooklm` |
| `verify-redisdocs-perplexity` | `/explainer/2026-10-19-redis-docs-mcp-b586a7879bc8/` | `/tools/perplexity/`，`utm_term=perplexity` |
| `verify-temporal-kb-perplexity` | `/explainer/2026-10-19-temporal-kb-mcp-server-967e3442e229/` | `/tools/perplexity/`，`utm_term=perplexity` |

第三筆用已公開的 Temporal 知識庫懶人包，連到已公開的 Perplexity 工具頁。錄音主題的既有卡仍在 2026-10-17 Nemotron 懶人包，指向 `reels/notta-minutes`。本週沒有第二則可索引、且尚未掛卡的錄音懶人包。

2026-10-17 的七張 Reel 卡仍由 `shared/jdToolCard.ts` 的 `JD_TOOL_CARDS` 提供，與本表的 key 不重疊。
