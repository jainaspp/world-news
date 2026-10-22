# 文明編年史 · 現況對照（Grok 4.7）

一頁映射。方案正文見 [`REWRITE-GROK-4.7-PLAN-2026-10-22.md`](./REWRITE-GROK-4.7-PLAN-2026-10-22.md)。處置只有四種：留、改名、拆、併。沒有刪路由。

## 十階

| 現況 | 約年代 | 方案 | 處置 |
|------|--------|------|------|
| 1 史前／採集狩獵 `#stage-1` | 約 300 萬年前至約 1.2 萬年前 | 退出正文。章首交接段保留 `#stage-1`，連到起源 | 拆：長文離開編年，錨留 |
| 2 農業革命 `#stage-2` | 約 1.2 萬年前至約 5000 年前 | 古 · `past-farm` 定居與剩餘 | 改名。正文留 |
| 3 城市與文字 `#stage-3` | 約公元前 4000–2000 年 | 古 · `past-city` | 留。`copy-check` 仍掛此 |
| 4 古典帝國與軸心時代 `#stage-4` | 約公元前 800–公元 200 年 | 古 · `past-classical` | 留。案例 `gear-pause` 仍在旁 |
| 5 中世紀與跨區域交流 `#stage-5` | 約公元 600–1500 年 | 古 · `past-copy` 複製與遠距 | 改名。正文留 |
| 6 科學革命與啟蒙 `#stage-6` | 約公元 1500–1800 年 | 古 · `past-method` | 留。`measure-promise` 仍掛此 |
| 7 工業革命 `#stage-7` | 約公元 1760–1914 年 | 古 · `past-steam` 只留躍升；維修與功率改掛 `now-power` | 拆 |
| 8 現代金融與全球體系 `#stage-8` | 約公元 1870–2000 年 | 今 · `now-credit` 仍在結算的信用 | 併入今。不再寫成已結束的階段 |
| 9 信息革命 `#stage-9` | 約 1960 年代至今 | 今 · `now-net` | 併入今。空日釘不再指向這裡 |
| 10 當代／近未來 `#stage-10` | 約 2000 年代至今 | 現行工具進 `now-net`；`#stage-10` 與展望橋改放 `future-door` | 拆。不設第十一階 |

舊錨與新 id 寫在同一節上，直到 P1 把 canonical href 改完。

## 路由與軸

| 現況 | 方案 | 處置 |
|------|------|------|
| 首頁軸七點：宇宙、地球、起源、技術、城市、今天（副標「切片」）、未來 | 七點不變。今天的副標改為「新聞」，仍指向 `#slice` | 改名副標 |
| 首頁編年條十個圓點 | 三章刻度，鏈到 `#past`、`#now`、`#future-door` | 改骨架 |
| 主欄目：文明、編年、今天、開蒙 | 文字與目的地不動 | 留 |
| `/civilization/` 十張階段卡 + 「十個階段」 | 按章分組的節卡；產品句改為三章 | 改骨架 |
| `/civilization/` 的 `#future`（F1–F6、展望、實例、檢查點） | 仍是展望全文的唯一正文 | 留 |
| 編年 `#stage-10` 內的展望・分域橋 | 升為章門 `#future-door`，仍只鏈六個既有錨 | 改掛點 |
| `/civilization/chronicle/` | 保留。頁內結構改為三章 | 留路由 |
| cosmos 十段、earth 八段、origins 長頁 | 深時間，不併入編年 | 留 |
| tech 十段、city 十段 | 橫切頁留。對照 href 在 P1 改新 id | 留 |
| `/#slice`、`/today/`、`/on-this-day/` | 分別定名為今日切片、更多今日、當年今日 | 留。只澄清名字 |
| `/learn/` | 軟鏈。P0 不加進編年 | 留 |
| `#monitor` / `clock.ts` | 獨立。禁止進入展望 published 文字 | 留 |
| 不存在的 `/civilization/future/` | 繼續不存在 | 刻意不加 |

## 掛點

| 現況掛點 | P0 | P1 |
|----------|----|----|
| `power-store` → `#stage-7` | 主錨改到 `now-power`。`#stage-7` 留在 `past-steam`，該節加一句歷史出處 | href 只留新 id |
| `copy-check` → `#stage-3` | 留 | 改記 `past-city`，舊錨仍在 |
| `measure-promise` → `#stage-6` | 留 | 改記 `past-method` |
| 問句 `repair-power`、`factory-repair-rhythm` → `#stage-7` | 改到 `now-power` | 同左，收成 canonical |
| 問句 `far-credit`、`clearing-same-day` → `#stage-8` | 隨第八階落到 `now-credit`；href 改新錨 | 同左 |
| 問句 `packet-bypass-fault` → `#stage-9` | 改到 `now-net` | 同左 |
| 問句 `planet-budget`、`risk-record` → `#future-f1`、`#future-f6` | 留 | 留 |
| 案例 `gear-pause` beside `stage-4` | 留，舊錨還在古典節 | beside 改 `past-classical` |
| 案例 `print-cost` 在技術頁 `#tech-7` | 留 | 留 |
| 城市頁 `chronicle: 2`、`chronicle: 3` | 舊錨仍可滾到 | href 改 `past-farm`、`past-city` |
| 切片先例 `/civilization/chronicle/#pattern-{id}` 與 `#stage-N` | 模式卡 id 不變；階錨仍在 | 先例表改記新 id，舊錨再留一版 |
| 封面 `civ-stage-1`…`10` | 檔名不改。編年主圖用 2–9；1 與 10 退出編年主圖 | 同左。`now-power` 暫用第 7 號圖 |

## 職能（重疊怎麼拆）

| 現況誰都在做 | 方案只留一處 |
|--------------|----------------|
| 首頁條、總覽卡、編年長文都在講十階 | 長文只在編年；總覽是入口；首頁是三章刻度 |
| 「今天」同時指軸點、切片、當日釘、第九／第十階 | 四個名字，見方案「資訊架構」 |
| 第十階與 `#future` 各講一次未來 | 全文只在 `#future`；編年只有章門 |
| 第一、二階與起源長頁各講一次深層人類史 | 起源長頁為準；編年只從定居與剩餘寫起 |
