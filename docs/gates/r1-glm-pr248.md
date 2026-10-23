# GLM 5.3 R1 — PR #248

- 檢測席：GLM 5.3
- 日期：2026-10-23
- 對象：[#248](https://github.com/jainaspp/world-news/pull/248) Wave-0 chronicle opt（table scroll trap CSS、top volume-only jumps、hub origins dedupe）
- 量測 SHA：`e3a44907847ffc541b28c3d1de137cf12d96dd9e`（head `cursor/wave0-chronicle-optimizations-50e0`）
- before 對照：`d939a0a`（`origin/main` 尖端，即 #198 合併點；#198 之後 main 無其他合併）
- 正典：`docs/gates/SITE-MAJOR-UPDATE-GATE.md`（LOCKED）
- **總判：FAIL**
- **Critical：1**（`P1-PERF`→P0 覆核：Civ M 4G LCP 超標且修復未落地）
- **TRAP-V08：FAIL**（#198 的延期只限該 PR，且已於「下一次站級重大更新」失效——本 PR 即是；無真機短片；本席無延期授權，不代 GM 延期）

本席只投票，不合併、不部署、不改產品碼。GM 仍是唯一上線簽字人（§7.1.6）。本文件是 docs-only 票：`docs/gates/r1-glm-pr248.md`＋`docs/gates/evidence/r1-glm-pr248/`。

## 觸發判定（§1）

命中 `TRIG-GLOBAL-CSS`（`src/App.css`：`.civ-article` `overflow-x: auto`→`clip`；`.civ-table` 加 `table-layout: fixed`＋`overflow-wrap: anywhere`；`.deep-time-grid` ≥960 由 3 欄改 2 欄）、`TRIG-TEMPLATE`（`shared/civilizationPage.ts`、`shared/civilization/spine.ts`、`shared/civilization/chronicle.ts`）、`TRIG-CIV`（hub 深時間板、編年頂部導航）。→ **全站閘（FULL GATE）**。四類免閘都不適用（動了 CSS、模板、DOM 順序）。本 PR 即 #198 之後第一次站級重大更新（#198 的 `TRAP-V08` 延期自此失效）。

## 量測方法

PR head worktree；`vite dev`（SSR middleware）與 `vite preview`（production `dist/`，同一批 functions 渲染器）雙跑核對；headless Chrome（puppeteer-core 驅動系統 chrome），360×800 與 390×844（isMobile/hasTouch），淺色與 `html.dark` 各一，每頁獨立 incognito context（攔 `sw.js`，防 service worker 把所有路由換成首頁快取）。頁面：H、C、N、origins、tech、city、S（`/#slice`）；L 在本席環境沒接上（`functions/learn` 未進 vite middleware），記未測不記 FAIL。`npx vitest run` 67 files／**411 passed**；`tsc --noEmit` 通過，與 PR 正文一致。機器讀值：`evidence/r1-glm-pr248/gate-results.json`；方法與細節：`evidence/r1-glm-pr248/measure-notes.md`；截圖 29 張在 `shots/`。

## 三個 PR 目標的獨立覆核（before → after）

| 目標 | before（`d939a0a` 實測） | after（`e3a4490` 實測） | 判定 |
| --- | --- | --- | --- |
| 表格捲動陷阱 | `.civ-article` 546 vs 328（360，吞 218px 橫滑）；390 為 546 vs 358 | 360：**328=328**；390：**358=358**；`.civ-table` 同；頁面級溢流全格 0 | 修復成立 |
| 頂部只留三卷跳 | 頁頂有 `跳到階段` 導航 | 頁頂只有 `跳到卷`（卷一 古／卷二 今／卷三 未來）；`#stage-1`…`#stage-10` 十錨全在；`古卷刻度`01–05、`今卷刻度`06–10 留在卷章內，晶片 79–127×44、間距 8px | 修復成立 |
| hub 起源去重 | `人類起源` h3 ×2＋深時間板第三張起源卡 | `人類起源` h3 恰 1（文明層卡）；深時間板只剩 宇宙長河＋地球生命；「閱讀人類起源」→`/civilization/origins/` 不變 | 修復成立 |

## P0（本席 360/390 × 淺暗可測範圍）

| ID | 結果 | 依據 |
| --- | --- | --- |
| `P0-OVERLAP` | PASS | §2.4 正典碰撞腳本在 H、C、N（＋origins、tech、city）× 360/390 × 淺暗 × 首屏/頁尾回傳空 |
| `P0-CLIP` | PASS | 本 PR 觸到的面（表格 th/td、晶片、章標、卷導航）`clipped()` 全陰性。軸 `.lab`/`.yr` 的正典腳本命中是軸軌內部橫滑把末三顆滑出視軌（#198 前既有、本 PR 未動）：靜止與滑到末端節點都整顆在／整顆出，無半字 |
| `P0-HSCROLL` | PASS | `documentElement.scrollWidth−clientWidth` 與 `scrollingElement` 覆核全格 0；修復前 `.civ-article` 546 vs 328 的陷阱已收 |
| `P0-HSCROLL-COLLIDE` | PASS | `.deep-axis`、`古卷刻度` 滑到末端 0 半切晶片；頁面 `scrollWidth` 不動；晶片列 wrap、edge gap 8px |
| `P0-FIXED-WIDTH` | PASS | `table-layout: fixed`＋`overflow-wrap: anywhere` 後無撐寬元素；offender 掃描僅剩內部橫滑軌與既有 ticker 連結 |
| `P0-TOUCH-44` | PASS | 0 個 < 44：卷晶片、階段晶片 79–127×44、`.axis-cta a`、`.axis-node`、版頭圖示 |
| `P0-CTA-COVER` | PASS | 貼頂 `.chrome` 實高 H 161／C 117／N 202 ≤ `--civ-anchor-offset` 220／133／218；`#slice`、`#ch-now`、`#stage-6` 落點距貼頂 15–63px（≥8） |
| `P0-CTA-TARGET` | PASS | H「打開文明總覽」→`/civilization/`；C「閱讀人類起源」→`/civilization/origins/`（本 PR 未動）；C「跳到今日切片」→`/#slice` 離開總覽且落點在貼頂列下；整句可見 |
| `P0-Z-STACK` | PASS | 碰撞掃描空；點擊都落在目標；無裝飾層吃點擊 |
| `P0-NAV` | PASS | 主欄目晶片靜止全完整可點（文明/編年/今天/開蒙），無半切 |
| `P0-BRAND` | PASS | 版頭五字「文明編年史」完整、無簡體；六路 `<title>` 與站名一致 |
| `P0-CONTRAST` | PASS | 實底實字抽樣：軸 yr 7.32、lab 9.46、軸標題 15.24、kicker 7.32、切片眉題 7.9、N 晶片 15.24／11.34、表頭表身 15.1／17.06，全 ≥4.5 |
| `P0-DARK-PAPER` | PASS | N 三條 `.chapter-band` 墨底 `rgb(22,28,36)` 紙字 `rgb(247,241,230)`；暗色晶片對比 11.34 |
| `P0-INK-TOKEN` | PASS | 墨/紙 token 抽樣無亮暗混色；本 PR 未動色 token |
| `P0-AXIS-NODES` | PASS | 相鄰節點中心距 81px（≥24）；可見節點標籤不相撞；滑到末顆無半切（既有軸，本 PR 未動） |
| `P0-ROUTE` | PASS（headless） | H、C、N、origins、tech、city 直連 200、有骨架、無白屏；`/#slice` 直達落點正確。L 未測（見方法） |
| `P0-DOM-EXPECT` | PASS | H：軸、`.axis-cta`、`.chronicle-band`（三張 `.volume-card`）、`.axis-rails`、`#slice` 全在；C：`.axis-title`、`.deep-axis`、`.axis-cta`、三張 `.volume-card`（`.volume-board`）、`.pattern-axis`、`.case-axis` 全在；N：`#ch-ancient`/`#ch-now`/`#ch-future`＋`#stage-1`…`#stage-10` 全在 |
| `P0-RENDER-ERR` | PASS | 28 次載入 0 uncaught；僅本席攔 `sw.js`/analytics 之 ERR_FAILED |
| `P0-NEWS-CHROME` | 未測 | A 兩篇未量；§7.3 亦無該證據 |
| `P0-CHRONICLE-PAGE` | PASS | 360/390 淺暗：階段標題、封面、模式卡零相交；表格換行不裁字；無頁面橫滾。768/1280 未量 |
| `P0-LEARN-STACK` | 未測 | 本席環境 `/learn/` 未接 SSR；不記 FAIL |

**`P1-PERF`→P0 覆核：FAIL（Critical 1）。** #198 依 §7.2 豁免兩列（Home、Civ 的 M 4G LCP），指定修復落在「下一次走本閘的部署」＝本次。本 PR 無任何 LCP 修復。Civ hub 英雄圖與字體本 PR 未動：R8 正典 Lighthouse 5.4s（倉內紀錄）＋本席 2026-10-23 production build、CDP slow-4G（1.6Mbps/150ms RTT、CPU 4×）實測 11032ms，兩數一致超過 2.5s。豁免列改按 P0 覆核即 FAIL，而 P0 不可由投票或 GM 豁免。Home 列 R8 正典 4.4s 與本席模擬 1456ms 矛盾，記未證實，待正典 Lighthouse；Civ 列證據一致，計 Critical。Chronicle 模擬 2496ms 貼線（新列，未在豁免範圍）。

## 陷阱（§6）

| ID | 結果 | 說明 |
| --- | --- | --- |
| `TRAP-V01` | PARTIAL | 24 張 360/390 淺暗矩陣＋5 張特寫（見 `shots/`）；before/after 覆核上表。缺六頁 × 五寬全長 diff 矩陣 |
| `TRAP-V02` | PASS | 正典腳本全格零碰撞（見 `P0-OVERLAP`） |
| `TRAP-V03` | PARTIAL | 掃描列出 `position`/溢流元素：`.deep-axis`（軌內橫滑）、ticker 連結（暫態）。負 margin（−16px）未撐頁 |
| `TRAP-V04` | PARTIAL | 真點擊：`#slice`、`#ch-now`、`#stage-6`、跨頁「跳到今日切片」全落點正確；頁中/頁尾截圖在 `shots/`。缺三態 × 三寬全矩陣 |
| `TRAP-V05` | PASS（headless 類比） | 軸軌與古卷刻度滑到末顆 0 半切、頁面不跟著晃。真手指斜滑未驗（歸 `TRAP-V08` 類） |
| `TRAP-V06` | 未測 | 未注入當日最長標題/最長 pill |
| `TRAP-V07` | PASS（computed 抽樣） | 對比取 computed color 對實底，非照片取樣；全 ≥7.32（見 `P0-CONTRAST`） |
| `TRAP-V08` | **FAIL** | 無 iOS Safari／Android Chrome 真機或雲端真機短片滑完 H 與 C。#198 的 GM 延期（2026-10-22 晚 LOCK）明文「只限 #198」且「下一次站級重大更新起本延期失效」；#198 合併後 main 無其他合併，本 PR 即該「下一次」，硬要求已恢復。無 GM 為 #248 出延期裁決；本席不代 PP O／GM 延期，桌面 headless 不算通過 → 記 **FAIL**，不記 DEFERRED |
| `TRAP-V09` | 未測 | 網址列展開/收合兩態需真機 |
| `TRAP-V10` | 未測 | 劉海與手勢條 safe-area 需真機 |

## §7.3 證據包盤點（§7.1.5）

PR #248 正文只有 headless console 數字，未附證據包：

1. 全長截圖矩陣（六頁 × 淺暗 × 360/390/768/1280/1440，H/C 加 414/1024）：**缺**
2. 事故同框與點擊（C/H 同框、點擊落點、A 兩篇、版頭特寫、VP-LAND）：**缺**
3. 逐條 P0 的 ≤640 專檔＋`scrollWidth` console 輸出：**缺**
4. `TRAP-V02` 報告：**缺**（本席自測為零碰撞，屬本席票據，不替代 PR 證據包）
5. 間距 <8px 的座標或工具圖：**缺**
6. console 無阻斷錯誤的截圖/錄影：**缺**
7. Lighthouse 行動端截圖（LCP、INP、CLS）：**缺**；`P1-PERF`→P0 覆核未做正典量測（見上）
8. iOS Safari＋Android Chrome 短片：**FAIL**（`TRAP-V08`；延期已失效，非 DEFERRED）
9. 證據表（ID、頁、視口、主題、結果、檔名、檢測席）：**缺**

缺任一項即依 §7.1.5「視為未測，整閘不得 PASS」。

## 判決

**FAIL，Critical＝1。**

1. `P1-PERF`→P0 覆核 FAIL（Civ M 4G LCP 5.4s 正典＋11.0s 本席模擬，修復未落地）。P0 不可豁免，Critical 不為 0。
2. `TRAP-V08` FAIL：真機短片缺，#198 延期已失效，無新延期授權。
3. §7.3 證據包九項全缺，整閘不得 PASS（§7.1.5）。

本席量測範圍內，三個 Wave-0 修復本身全部成立，無新增佈局 Critical：修的是真問題，量得到的地方都過。擋關的是效能債未清、真機證據缺席、證據包未建。

## R2 需補

- Civ hub M 4G LCP 修復落地（P0 不可豁免），或由 GM 依閘規另議（本席不預設）；隨附正典 Lighthouse 截圖（Home 列也一併正典覆核）
- iOS Safari＋Android Chrome 短片各一支滑完 H 與 C（雲端真機可）
- §7.3 全套證據包（九項），併入 PR
- L、A 兩頁與 768/1280/1440、VP-LAND 的量測補齊

本席投票至此。不合併、不部署、不開修復 PR、不動產品碼。
