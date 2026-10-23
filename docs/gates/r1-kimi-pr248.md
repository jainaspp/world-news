# PR #248 R1 · Kimi K3

日期：2026-10-23
席：Kimi K3
對象：[#248](https://github.com/jainaspp/world-news/pull/248) fix(chronicle): Wave-0 table scroll, volume jumps, one origins entry
量測 SHA：`e3a44907847ffc541b28c3d1de137cf12d96dd9e`（`cursor/wave0-chronicle-optimizations-50e0`）
基線：`main` `d939a0a`（#198 合入後），同一套量測器重跑做 before／after
正典：`docs/gates/SITE-MAJOR-UPDATE-GATE.md`（LOCKED 2026-10-20；含 2026-10-22 重鎖與 2026-10-22 晚只限 #198 的 TRAP-V08 LOCK）
證據：`docs/gates/evidence/r1-kimi-pr248/`

## 票

**FAIL。Critical＝0。`TRAP-V08`＝FAIL。**

本票是投票紀錄，不是 GM 上線簽字。未 merge，未 deploy。本席沒有改產品程式；本 PR 只加本文件與證據。

整閘 FAIL 的理由有兩項，都不是 P0：

1. **`TRAP-V08` 回本 PR 已恢復硬要求，缺片記 FAIL。** 2026-10-22 晚（HKT）LOCK 白紙黑字「**只限 #198**」，並寫明「下一次站級重大更新起本延期失效」（裁決文 `docs/gates/reviews/2026-10-22-pr198-GM-TRAP-V08-DEFER.md` 同句）。#248 命中全站閘（見下），正是下一次站級重大更新。本 PR 沒有 iOS Safari／Android Chrome 真機或雲端真機短片。本席是桌面 headless Chrome，LOCK 明講桌面模擬不算通過。本席無延期權：不虛構 PASS，也不虛構 DEFERRED。依正典記 **FAIL**（未測）。
2. **§7.3 證據未齊。** 本席 R1 只產出針對本 PR 檔案的聚焦證據（M 視口淺暗＋抽測），不是第 7.3 節全矩陣。缺項逐條列於下文「§7.3」。依 §7.1 第 5 點，缺件視為未測，整閘不得 PASS。

## 觸發判定

全站閘。命中：`TRIG-GLOBAL-CSS`（`src/App.css`：`.civ-article` overflow、`.civ-table` 佈局、`.deep-time-grid` ≥960px 欄數）、`TRIG-TEMPLATE`（`shared/civilizationPage.ts`、`shared/civilization/spine.ts`、`shared/civilization/chronicle.ts` 產出的 HTML 結構）、`TRIG-CIV`（編年頁導航結構、深時間板構成）、`TRIG-NAV`（編年頁內跳轉晶片列）。不屬第 1.4 節四類免閘（動了模板、class、CSS、DOM 順序）。

## 量測

Production `dist/`（`npm run build`）加 r8-pack `tooling/serve.mjs` 同一套 Pages Functions 渲染器（`injectHomeShell`、`renderCivilizationHub`、`renderChroniclePage`、`renderLearnPath`、`renderStoryPage`），`127.0.0.1:4173`。不是 Vite dev。Headless Chrome（puppeteer-core，`google-chrome`）。主題用 `localStorage.darkMode`；英雄以 `sessionStorage.wn_hero_seen=1` 停在揭曉後。本次 feed 823 則、1 個來源錯誤；頁 A 取當日最長標題（174 字「‘O Projeto’ Directors on Walter Salles’ Support…」，`/story/ad75c23b81d4/`）。正典 §2.4 碰撞腳本與 `clipped()` 原句搬進頁面，懶載走完回頂後在靜止首屏量測。基線 `main` 用同一套器同法重跑。

矩陣 **33 格**：chronicle／civ／home × 360／390 × 淺色／暗色；chronicle 768／1280 × 淺暗；civ 768 淺、1280 淺暗；home 1280 淺；learn 360 淺暗；story 最長標題 360 暗＋1280 淺；cosmos／earth／tech／city（同用 `.civ-table`）360 暗＋390 淺。另加聚焦探針（深時間板構成、軸軌滑到末段、卡片主點盒）與停幀後才量的錨點／點擊測試（4 個直達雜湊＋4 次真點晶片 × 360／390 × 淺暗；C 360 暗點「跳到今日切片」；H 360 暗與 1280 淺點「打開文明總覽」）。

CI：PR #248 `check` 兩次 run 皆 pass（`gh pr checks 248`）。本席重跑：`npx vitest run` **67 檔 411 項全過**；`npx tsc --noEmit` 通過。與 PR 自述相符。

## P0

**Critical＝0。21 條全部 PASS。** 量得到的每一條都以正典腳本或停幀點擊覆核；基線對照證明本 PR 只修不退。

| ID | 結果 | 依據 |
| --- | --- | --- |
| `P0-OVERLAP` | PASS | 正典十選擇器掃描 33 格全 0 對。第二輪 leaf 掃描只剩三類基線同紋 artifact：頁尾行內連結聯集盒（`world-news.xyz` 對「數據／重大更新」）、story 相關新聞卡標題與來源 span 聯集盒、cosmos 軸區兩 span（第一代星／星系結構）。main 同器同紋（僅 feed 標題長度令 story 對數 3↔4），非本 PR 引入。 |
| `P0-CLIP` | PASS | **chronicle 360／390 淺暗：0 旗標（基線 39 旗標——來源表儲存格被 `.civ-article` 的 `overflow-x: auto` 陷阱切開）。** cosmos／earth／tech／city 360／390：0（基線 7–13）。civ／home 360／390 各 6 旗標，與基線逐項相同：城市／今天／未來的 `.axis-node .lab/.yr` 整顆在 `.deep-axis` 內部橫滑軌窗外（`overflow-x: auto`）；軌滑到末段七顆全部完整入窗（360／390 實測 FULL），1280 靜止全見。沿用 R8 對 #198 的內部橫滑軌記法；本 PR 不碰 `.deep-axis`。 |
| `P0-HSCROLL` | PASS | 33 格 `documentElement.scrollWidth === clientWidth`，`scrollingElement` 覆核同。**`.civ-article`：基線 sw546／cw328（360，陷阱 218px）、sw546／cw358（390，188px）→ 本 PR sw＝cw（328／358），trap=false。** 與 PR 自述的 218／188 完全吻合。 |
| `P0-HSCROLL-COLLIDE` | PASS（靜止） | `.deep-axis` 軌 sw571／cw328（360）自帶殼，不與主層相交，頁面不橫晃；軌末七節點完整。來源表不再橫滑，改在格內包行。斜向／快速手滑未做（同 R7／R8 記法）。 |
| `P0-FIXED-WIDTH` | PASS | 33 格無 `rect.width > innerWidth + 1` 而又無自帶橫滑殼的元素（`wide[]` 全空）。 |
| `P0-TOUCH-44` | PASS | 點名主控全 ≥44：版頭晶片與圖示 44×44；`.axis-node` 69×55.2；`.axis-cta a` 108×44；編年卷晶片 77.6–93.6×44、階段晶片 ≥44；模式／案例晶片高 44。chronicle／civ／home 360 暗相鄰可點盒邊緣間距 <8px 者為零。兩宗基線同紋、非點名項：`.chrome` 字標連結 137.8×28（品牌圖連結，不在點名清單）；`.deep-time-card` 內文行內連結高 19–24px（正典「正文裡的行內文字連結不量」；卡片主點盒 `.stage-cover` 360 量 326×204、1280 量 482×301；起源卡移除後此類由 8 顆減到 6 顆）。 |
| `P0-CTA-COVER` | PASS | 停幀後量 16 次落地（4 雜湊直達＋4 真點晶片 × 360／390 × 淺暗）：目標標題與貼頂列下緣間距 **28.6–67px**，全 ≥8。C 360 暗真點「跳到今日切片」離開總覽落 `/#slice`，`scrollY` 2077，間距 **16.4px** ≥8（`2026-10-23-civ-360-dark-click-slice.png`）。 |
| `P0-CTA-TARGET` | PASS | C 360 暗「閱讀人類起源」整句 108×44 → `/civilization/origins/`，h1「人類起源時間線：從深時間到今日切片」。H 360 暗與 1280 淺「打開文明總覽」整句 108×44 → `/civilization/`，h1「人類文明」。 |
| `P0-Z-STACK` | PASS | 正典層 0 對相交；上述點擊全部進目標，無層吃掉。 |
| `P0-NAV` | PASS | 版頭晶片與圖示可見、≥44；各頁 200，無導航 404。 |
| `P0-BRAND` | PASS | `<title>`、`og:site_name` 皆「文明編年史」；正文無「编年史」；360 暗版頭特寫五字完整（`2026-10-23-civ-360-dark-top.png`、`2026-10-23-home-360-dark-top.png`）。 |
| `P0-CONTRAST` | PASS | 本 diff 不動任何色與 token。Computed 覆核：`.yr` `#c4a572` on `#161c24`、`.lab` `#c5c0b6`、軸標題 `#f7f1e6`、主鈕 `#161c24` on `#a18256`、編年晶片淺 `#161c24` on `#f7f1e6`／暗 `#f7f1e6` on `#3a3138`——同 R8 像素表對應對（7.32／4.77 等）的選擇器與色值。未重拍像素；如任何一席要新像素，R2 補。 |
| `P0-DARK-PAPER` | PASS | 暗色頁底 `#0e141c`；章扉 `.chapter-band` 淺暗兩態皆 `#161c24`；淺色頁底 `#f4f6f8`。無混色。 |
| `P0-INK-TOKEN` | PASS | diff 無 token 改動；上述 computed 抽五處無落舊色。 |
| `P0-AXIS-NODES` | PASS | 七節點標籤盒互不相交（leaf 掃描無軸節點對）；圓點在軌；可點盒 69×55.2；軌末全完整。 |
| `P0-ROUTE` | PASS | H、C、N、L、A（最長標題）、cosmos、earth、tech、city 直連皆 200 有正文；`#ch-ancient`、`#ch-now`、`#ch-future`、`#stage-1`…`#stage-10` 十三錨全在；`#slice` 在。 |
| `P0-DOM-EXPECT` | PASS | H：`.axis-hero.axis-slim`、`.axis-cta`、`.chronicle-band` 內 3 張 `.volume-card`、`.axis-rails`（`.pattern-axis`＋`.case-axis`）、`#slice` 齊，`.chronicle-strip`＝0（依重鎖不計）。C：`.axis-title`、`.deep-axis`、`.axis-cta`、3 張 `.volume-card`、`.pattern-axis`、`.case-axis` 齊。N：十三錨齊（實測 map 全 true）。 |
| `P0-RENDER-ERR` | PASS | 33 格 `pageerror`＝0、console error＝0。 |
| `P0-NEWS-CHROME` | PASS | 最長標題（174 字）360 暗與 1280 淺：無橫溢、無重疊、無裁字、版頭一致。一般稿 R1 未拍（記入 §7.3 缺口）。 |
| `P0-LEARN-STACK` | PASS | L 360 淺暗 0 重疊 0 裁切。 |
| `P0-CHRONICLE-PAGE` | PASS | N 360／768／1280 × 淺暗：0 對相交、0 裁切、無橫滾；頂部保留模式卡／案例專篇導航；錨點落地全在貼頂列下。 |

## 本 PR 三項修復的專項覆核

1. **`chron-mobile-table-scroll-trap`（#245）——成立。** `.civ-article` 改 `overflow-x: clip`＋`min-width: 0`，`.civ-table` 改 `table-layout: fixed`＋`overflow-wrap: anywhere`（連 `<a>`）。實測：article 陷阱 218px（360）／188px（390）→ 0；表 sw＝cw；儲存格無內容溢出（`cellOver` 0）；360／390 裁切旗標 39→0；cosmos／earth／tech／city 同源表 7–13→0。近拍 `2026-10-23-chronicle-360-dark-table-near.png`、`2026-10-23-chronicle-390-{dark,light}-table-near.png`：長網址在格內包行，階段號與機構名可讀。
2. **`chronicle-jump-volumes-first`（#246）＋ `chron-stage-nav-dupe`（#247）——成立。** `#ch-ancient` 之前的導航列：跳到卷（3 晶片）、模式卡（3）、案例專篇（1）；頂部**無**「跳到階段」（基線頂部有 10 顆階段晶片）。古卷刻度 5 晶片（#stage-1…5）在卷一內、今卷刻度 5 晶片（#stage-6…10）在卷二內。十三錨全在；卷跳與階段跳 16 次落地間距 28.6–67px。
3. **`civ-hub-origins-triple`（#247）——成立。** 深時間板只有宇宙長河、地球生命兩卡；deep-time 範圍內 `/civilization/origins/` 連結 0 個、「人類起源」字樣無；`<h3>人類起源</h3>` 全頁**恰好 1 個**，在文明層卡上連 `/civilization/origins/`；「起源摘要」節已移除；軸上「起源」節點保留；「閱讀人類起源」主鈕不變且實點到達。`.deep-time-grid` ≥960px 由 3 欄改 2 欄實測生效（1280：`484px 484px`）。

## P1

不計入 Critical。本席 R1 量到的：

- `P1-MIN-FONT` PASS：N／C 360 淺暗 computed 掃描無 <12px 非裝飾文字。
- `P1-TABLET-GAP` PASS：768 各格 0 重疊 0 裁切。
- `P1-AD-HOLD` PASS：33 格無廣告框。
- `P1-DARK-LEAK` PASS：33 格截圖無漏白殘塊。
- `P1-IMG` PASS：本 diff 不動圖；封面 lazy＋`onerror` 隱藏路徑未變。
- **未測（記未測，不記 PASS）**：`P1-PERF`、`P1-CLS`（本席未跑 Lighthouse 行動端，§7.3 第 7 項缺）、`P1-MOTION`、`P1-I18N`、`P1-FOCUS`、`P1-MORE-MENU`、`P1-SAFE-AREA`、`P1-STICKY-XBROWSER`（部分須真機）、`P1-EMPTY-MEDIA`。

## P2

- `P2-SWIPE-HINT`：360 靜止時「城市」節點在軌右緣露出約 12px（≥8px 提示成立）。
- `P2-AUTO-SCROLLWIDTH`：本 PR 在 vitest 加了 CSS 斷言（`overflow-x: clip`、`table-layout: fixed`、nav 結構），朝本項走近一步；運行時 `scrollWidth` 斷言仍未入測。
- `P2-AXIS-DENSITY`：窄屏仍是七點橫軸，靠內部橫滑軌維持，再記一次備註。

## 視覺陷阱

| ID | 結果 |
| --- | --- |
| `TRAP-V01` | PASS（聚焦）。受影響頁 360／390 全長圖齊，chronicle 360 暗附基線 main 全長對照（`…-full-baseline-main.png`）；人工覆核差異：頂部階段導航移除、來源表包行、深時間板兩卡。非六頁全矩陣 diff。 |
| `TRAP-V02` | PASS。正典腳本原句，33 格靜止首屏 0 碰撞，無例外項要寫。 |
| `TRAP-V03` | PASS。diff 無新增 absolute／fixed／負 margin（只動 overflow、table、grid 欄數）。 |
| `TRAP-V04` | PASS。4 雜湊直達＋4 真點 × 360／390 × 淺暗，停幀才量；360 暗錨點圖 `…-anchor-ch-now.png`、`…-anchor-stage-7.png`；C 點切片圖在。 |
| `TRAP-V05` | PARTIAL。軸軌滑到末段七節點完整；斜向／快速手滑 headless 做不到（同 R7／R8 記法）。 |
| `TRAP-V06` | PASS。當日最長真實標題 174 字在 story 360 暗無溢出無裁切；編年長網址格內包行（近拍）。 |
| `TRAP-V07` | NOT-RUN。diff 無色改，以 computed 覆核代替；像素取樣留待全證據包。 |
| `TRAP-V08` | **FAIL。** 延期只限 #198，且「下一次站級重大更新起本延期失效」；#248 即下一次站級重大更新，硬要求恢復。本 PR 無 iOS Safari／Android Chrome 真機或雲端真機短片。本席桌面 headless 不算；本席無延期權，不虛構 PASS／DEFERRED。 |
| `TRAP-V09` | NOT-RUN。網址列展合兩態超出本 harness。 |
| `TRAP-V10` | NOT-RUN。瀏海／手勢條須真機或帶安全區模擬。 |

## §7.3

**未齊。** 依 §7.1 第 5 點整閘不得 PASS。逐項：

| # | 項 | 本席核對 |
| --- | --- | --- |
| 1 | 全長矩陣 | **缺。** 只有受影響頁的 360／390 淺暗全長＋chronicle 768／1280、civ 768／1280、home 1280 淺；無六頁 × 五寬 × 淺暗全矩陣，無 414／1024，無 H／C 頁中頁尾錨點三態全組。 |
| 2 | 事故同框與點擊 | **部分。** C 360 暗首屏同框（軸、兩主 CTA、模式軌、案例軌）與點切片圖在；C 390 暗、H 四組合、N 模式卡特寫、VP-LAND 等未成套。 |
| 3 | 每條 P0 ≤640 專檔＋`scrollWidth` | **部分。** 受影響頁的對應檔在；`scrollWidth` console 數字在 `measurements-pr248.json`（逐格），無撐寬元素（`wide[]` 全空）。未做 21 條逐條配圖表。 |
| 4 | `TRAP-V02` 報告 | 齊（33 格 0 碰撞，本文「P0-OVERLAP」行）。 |
| 5 | 間距 <8px | N/A-with-note：chronicle／civ／home 360 暗相鄰可點盒 <8px 為零，無需盒子邊線圖。 |
| 6 | console 無阻斷錯誤 | **部分。** 33 格 pageerror／console error 計數全 0（鈎子實錄）；未留截圖／錄影本體。 |
| 7 | Lighthouse 行動端 | **缺。** 本席未跑。 |
| 8 | 真機短片 | **FAIL。** 見 `TRAP-V08`。 |
| 9 | 證據表 | 本文件內嵌（ID、頁、視口、主題、結果、檔名、檢測席散見上表與下節），未出獨立 EVIDENCE-TABLE。 |

## 證據檔

`docs/gates/evidence/r1-kimi-pr248/`

- `measurements-pr248.json` — PR head 33 格：正典碰撞、clip、leaf、觸控盒、相鄰間距、橫溢、寬元素掃、DOM 骨架、article／table／nav／anchors 專項、console 錯誤
- `measurements-baseline-main.json` — `main` `d939a0a` 同器同法對照（article 陷阱 218／188px、chronicle 39 裁切、頂部 10 階段晶片）
- `focus-civ-pr248.json` — 深時間板構成、軸軌末段、卡片主點盒
- PNG（`{日期}-{頁}-{視口}-{主題}[-狀態]`）：chronicle 360／390 淺暗全長＋360 暗首屏＋基線對照＋錨點＋來源表近拍＋768／1280；civ 360／390 淺暗全長＋360 暗首屏＋點切片＋1280 淺；home 360 暗首屏全長＋390 淺；learn 360 暗；news 360 暗／1280 淺；cosmos／earth／tech／city 360 暗

## 之後

建議：補全套 §7.3 證據包（pack 式全矩陣＋Lighthouse 行動端＋證據表），並由 GM 就 `TRAP-V08` 定奪（PP O 有無真機／雲端真機；本席只陳述正典現狀：本 PR 不在延期範圍）。齊件後 R2 三席重投。

## 席

Kimi K3 · R1 · **FAIL** · Critical＝0 · `TRAP-V08`＝FAIL · SHA `e3a44907847ffc541b28c3d1de137cf12d96dd9e`
