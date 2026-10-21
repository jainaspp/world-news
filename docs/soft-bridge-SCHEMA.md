# 軟橋契約（P0）

新聞站是主軸。本頁只規定懶人包頁尾的一張教學卡。不新增可索引的 `/tools/<slug>/` 正文，也不新增 `/reels/` 路由，不改域名，不改廣告開關。`/tools/` 若出現，只可以是 [`tools-layer-SCHEMA.md`](./tools-layer-SCHEMA.md) 所寫的 noindex 草稿索引，而且不進網站地圖。

資料在 `shared/softBridgePairs.ts`。每週追加一筆即可，渲染器不用另開分支。

## 同題伴頁欄位

| 欄位 | 含義 |
|------|------|
| `slug` | 伴頁編號。本週已鎖定的六筆不可改指向 |
| `explainerKey` | 懶人包 key，對應 `/explainer/<key>/` |
| `lazyPackUrl` | 世界頭條懶人包網址 |
| `jdUrl` | JD Tech 工具頁或 Reel 頁，不含查詢字串 |
| `utmTerm` | Concept B 的 `utm_term` |
| `cta` | 主連結文字，書面中文 |
| `disclosure` | 連結下的說明，書面中文 |
| `follow` | 可選。只有「跟住做 90 秒」卡才填。沒有就維持一句連結 |
| `follow.receipt` | 卡內首行收據，書面一句，不重複三步 |
| `follow.title` | 卡題，書面中文 |
| `follow.steps` | 步驟，書面中文，不綁過期介面文案。序號由列表產生 |
| `follow.secondary` | 次鏈：`label`、`jdUrl`（不含查詢字串）、`utmTerm` |

一筆就是一組同題伴頁：懶人包網址 × JD 工具或 Reel 網址 × `slug`。`follow` 不另開第二張卡，主鏈仍是該筆的 `jdUrl`。

## UTM（Concept B）

| 參數 | 值 |
|------|----|
| `utm_source` | `worldnews` |
| `utm_medium` | `referral` |
| `utm_campaign` | `toolcard` |
| `utm_content` | `card-footer` |
| `utm_term` | 該筆的 `utmTerm` |

已否決的寫法不再使用：`utm_campaign=mustread_tool`、`utm_source=world-news`。

## 雙向配對故意不對稱

世界頭條的工具卡連到 JD 已公開的工具說明頁（`/tools/…`），`utm_campaign=toolcard`。JD 回連世界頭條時，伴頁落在 Reel（`/reels/…`），活動參數是 `companion`。同一題可以一邊是工具頁、一邊是短片。WN→tools 與 JD→reels 是刻意的不對稱，不是斷鏈。

例：`memory-mem0-copilot-summary` 的卡連到已公開的 `/tools/copilot/`，`utm_term` 仍是 `copilot-summary`。JD 側的 Reel `reels/copilot-summary/` 可以同時存在。兩邊網址不同，仍是同一組伴頁。有已公開工具頁時，本站卡用工具頁，不改回 Reel 來「對齊」JD。

`jdUrl` 若無法被 `new URL` 解析，`softBridgeIssues` 收集 `${slug}:jdUrl`。`softBridgeHref` 回傳空字串，頁面略過該卡。伺服器渲染不得因壞網址中斷。

次鏈只出現在設了 `follow` 的那一筆。次鏈的 `jdUrl` 解析失敗時，`softBridgeIssues` 另收 `${slug}:secondaryJdUrl`，`softBridgeSecondaryHref` 回傳空字串，卡面略過次鏈，主鏈仍渲染。次鏈壞掉不會把主鏈一併清掉。

## 編輯

- 世界頭條卡面用書面中文。標籤是「教學：JD Tech」。粵語留在 JD 的短片與工具說明頁。
- 一則懶人包頁尾至多一張卡，放在來源列表之上。
- 文明軸正文不掛卡。薄頁與 `noindex` 頁不掛卡。只有已達公開門檻的懶人包才渲染。
- JD 網址必須是已經公開的頁面。沒有對得上的已發布懶人包，就不追加。不虛構錄音網址。

## 本週六筆

| slug | 懶人包 | JD |
|------|--------|----|
| `reread-llamaparse-notebooklm` | `/explainer/2026-10-19-llamaparse-per-product-mcp-c15c091b4276/` | `/tools/notebooklm/`，`utm_term=notebooklm`。卡面為「跟住做｜90 秒」；次鏈 `/reels/notebooklm-pdf-podcast/`，`utm_term=notebooklm-pdf-podcast` |
| `verify-redisdocs-perplexity` | `/explainer/2026-10-19-redis-docs-mcp-b586a7879bc8/` | `/tools/perplexity/`，`utm_term=perplexity` |
| `verify-temporal-kb-perplexity` | `/explainer/2026-10-19-temporal-kb-mcp-server-967e3442e229/` | `/tools/perplexity/`，`utm_term=perplexity` |
| `read-web-firecrawl-copilot` | `/explainer/2026-10-19-firecrawl-mcp-hosted-oauth-keyless-e245baec4022/` | `/tools/copilot/`，`utm_term=copilot` |
| `remember-cognee-notebooklm` | `/explainer/2026-10-19-cognee-mcp-memory-server-9cf986969ef6/` | `/tools/notebooklm/`，`utm_term=notebooklm` |
| `agreements-docusign-gemini` | `/explainer/2026-10-19-docusign-mcp-server-ga-a0cb3575b879/` | `/tools/gemini/`，`utm_term=gemini` |

前三筆維持原指向。`reread-llamaparse-notebooklm` 的主鏈仍是 `/tools/notebooklm/`；卡面改為收據一行、三步、主鏈「打開工具說明」、次鏈 Reel。`remember-cognee-notebooklm` 仍是一句 CTA，不套用這張卡。後三筆追加在 2026-10-19 已公開的懶人包上：Cognee 的 remember／recall 對上 NotebookLM 的一疊文件再問；Docusign 的協議關鍵日期與條款對上 Gemini 的長文件核對。`read-web-firecrawl-copilot` 的欄位仍指向 `/tools/copilot/`，不改指向。Firecrawl 懶人包的頁尾卡改由下方 P1 筆渲染（一頁一卡）。三個 JD 網址均為當日 sitemap 內已公開的工具頁。

n8n、Activepieces、Pipedream、Composio、Windmill 等自動化懶人包當日已上線，JD 沒有已公開的對應工作流工具頁或 Reel，故不配對，也不虛構錄音網址。錄音主題的既有卡仍在 2026-10-17 Nemotron 懶人包，指向 `reels/notta-minutes`。本週沒有第二則可索引、且尚未掛卡的錄音懶人包。

2026-10-17 的七張 Reel 卡仍由 `shared/jdToolCard.ts` 的 `JD_TOOL_CARDS` 提供，與本表的 key 不重疊。

## P1 三筆（2026-10-19）

只追加研究稿裡雙邊已公開、HTTP 200 的三筆。Notta 錄音、Gemini PDF 期限、CapCut 自動字幕沒有已發布懶人包，不寫入。

| slug | 懶人包 | JD |
|------|--------|----|
| `verify-firecrawl-perplexity-myth` | `/explainer/2026-10-19-firecrawl-mcp-hosted-oauth-keyless-e245baec4022/`（與鎖定筆同一 key） | `/tools/perplexity/`，`utm_term=perplexity-myth-check` |
| `memory-mem0-copilot-summary` | `/explainer/2026-10-19-mem0-hosted-mcp-00290c292710/` | `/tools/copilot/`（工具頁已公開），`utm_term=copilot-summary` |
| `cms-strapi-claude-rewrite` | `/explainer/2026-10-19-strapi-mcp-server-ga-cee6301eb39f/` | `/tools/claude/`，`utm_term=claude-rewrite` |

Firecrawl 懶人包已有鎖定筆 `read-web-firecrawl-copilot`。一頁只渲染一張卡，後寫入的 P1 筆勝出，頁尾改為 Perplexity 謠言核對。鎖定筆的欄位不改，只是不再渲染。Mem0 對上 Copilot 工具頁，不是 Reel。
