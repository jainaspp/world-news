# Grok 4.7 R1 票 — PR #248

日期：2026-10-23  
檢測席：Grok 4.7  
對象：[#248](https://github.com/jainaspp/world-news/pull/248) `fix(chronicle): Wave-0 table scroll, volume jumps, one origins entry`  
產品分支：`cursor/wave0-chronicle-optimizations-50e0`  
量測 SHA：`e3a44907847ffc541b28c3d1de137cf12d96dd9e`  
正典：`docs/gates/SITE-MAJOR-UPDATE-GATE.md`（LOCKED，來源 #183；2026-10-22 重鎖 §2.2／`P0-DOM-EXPECT`／§2.3；同日晚 `TRAP-V08` 延期只限 #198）  
性質：投票紀錄。不改 app、不改 CSS、不改 runtime、不合併 #248、不部署。

## 結果

**FAIL。Critical＝0。TRAP-V08＝FAIL。**

這不是上線簽字。另外兩席仍要各自投票。只有 GM 能簽字部署。

Critical 只數第 3 節 P0。本席在打開的切片上沒有記下一條 P0 FAIL，所以 Critical＝0。整閘仍是 FAIL：`TRAP-V08` 沒有真機短片，而且 §7.3 證據包不齊。未測的格子沒有寫成 PASS。

## 為什麼是全站閘

diff 動到 `shared/civilization/chronicle.ts`、`shared/civilization/spine.ts`、`shared/civilizationPage.ts`、`src/App.css`。

| 觸發 | 原因 |
| --- | --- |
| `TRIG-CIV` | `/civilization/chronicle/` 頂部跳轉從「卷＋十階段」收成三卷；`#stage-1`…`#stage-10` 仍在各卷章內。`/civilization/` 的深時間板去掉人類起源卡 |
| `TRIG-GLOBAL-CSS` | `src/App.css`：`.civ-article` 的 `overflow-x`、`.civ-table` 的 `table-layout`／`overflow-wrap`、`min-width: 960px` 的 `.deep-time-grid` 欄數 |
| `TRIG-TEMPLATE` | 編年文章、hub 導語、深時間板的 HTML 結構 |

沒有落入第 1.4 節四類免閘。拿不準也不降成免閘。

## TRAP-V08

**FAIL。**

正典文首 LOCK（2026-10-22 晚 HKT）把缺片記 **DEFERRED** 的權力只寫給 [#198](https://github.com/jainaspp/world-news/pull/198)。同一段寫明：下一次站級重大更新起，延期失效。#198 已合併（`d939a0a`）。#248 命中上面三條觸發，是下一次全站閘。

PP O 當日沒有真機、答「我唔知」，GM 代為把 **#198** 的 `TRAP-V08` 與 §7.3 第 8 項延後。裁決在 `docs/gates/reviews/2026-10-22-pr198-GM-TRAP-V08-DEFER.md`。那份裁決寫明延期不碰到任何 P0，桌面 DevTools 仍然不算通過，而且下一次站級重大更新起恢復硬要求。本席不把那份只限 #198 的延期拿來蓋 #248，也不另造延期權。

本環境沒有：

- iOS Safari 真機或雲端真機短片，滑完 H `/` 與 C `/civilization/`
- Android Chrome 真機或雲端真機短片，同樣滑完 H 與 C

桌面 Chrome headless 的 360／390 截圖是執行卡幾何，不是 `TRAP-V08`。沒有偽造短片。

`TRAP-V08` 不是 P0 編號，不併進 Critical。它單獨就使本席不能投 PASS。`P1-STICKY-XBROWSER` 依賴同一組短片，記未測。本席沒有看見黏性層壞掉，也不把「沒看到」寫成通過。

## 量測方法

`npm run build`（`e3a4490`）的 `dist/`。頁面用與 #198 證據包相同的渲染器：`injectHomeShell`、`renderCivilizationHub`、`renderChroniclePage`，`http://127.0.0.1:4173`。文明頁連的是建置時複製的 `/site.css`（由 `src/App.css` 而來），裡面有 `overflow-x: clip` 與 `table-layout: fixed`。首頁樣式塊是 `dist/assets/index-CXkWgp-y.css`。不是 Vite dev。

桌面 Chrome headless。視口 360×800、390×844。`localStorage.darkMode` 與 `prefers-color-scheme` 切主題。這不是 iOS Safari，也不是 Android Chrome。

`document.fonts` 裡的 Noto Sans TC 狀態是 `unloaded`。字標是 SVG。表格拉伸與 `overflow-wrap: anywhere` 不靠該 webfont 才把橫向溢位收進儲存格；字級對比不拿這次 fallback 當生產 Noto 的通過。

原始列：`docs/gates/evidence/pr248-grok-r1/measurements.json`。圖在同一目錄，檔名 `2026-10-23-{chronicle|civ|home}-{360|390}-{light|dark}-*.png`。

產品 PR 的 GitHub `check` 在本席查看時兩次都是 pass：

- https://github.com/jainaspp/world-news/actions/runs/39951381435/job/120406410693
- https://github.com/jainaspp/world-news/actions/runs/39951405799/job/120406491825

那是 #248 的 CI，不是本投票 PR 的 CI。

## 本 PR 三件事，在 360／390 × 淺色／暗色

### 1. 編年表不再橫向滾動文章

`.civ-article` 的 computed `overflow-x` 是 `clip`，`overflow-y` 是 `visible`。`clip` 配 `visible` 沒有把文章收成第二個捲動埠。

| 頁 | 視口 | 主題 | 頁 `scrollWidth` | 文章 `scrollWidth − clientWidth` | 表 `scrollWidth − clientWidth` | 表內 `scrollWidth > clientWidth + 1` 的元素 |
| --- | --- | --- | --- | --- | --- | --- |
| N 編年 | 360 | 淺、暗 | 360＝360 | 0（328＝328） | 0（328＝328，38 列，`table-layout: fixed`） | 0 |
| N 編年 | 390 | 淺、暗 | 390＝390 | 0（358＝358） | 0（358＝358） | 0 |
| C 總覽 | 360 | 淺、暗 | 360＝360 | 0（328＝328）。總覽沒有 `.civ-table` | — | 文章內 0 |
| C 總覽 | 390 | 淺、暗 | 390＝390 | 0（358＝358） | — | — |

編年文章裡的 `h1`／`h2`／`h3`／`p`／`td`／`th`／`a`／`li`／`.chip`／`.chapter-kicker`，正典 `clipped()` 的部分切開（盒子跨過 overflow 祖先的可見緣）是 0。表圖：`2026-10-23-chronicle-360-dark-table.png`、`2026-10-23-chronicle-360-light-table.png`，以及 390 的兩張。長網址在儲存格裡換行，階段號仍在第一欄。淺色表底取樣約 `(244,246,248)`，暗色表底取樣 `(14,20,28)`，即頁底 `#0E141C`。

### 2. 編年頂部只留三卷跳轉

`如何閱讀本編年` 到 `#ch-ancient` 之間：有 `aria-label="跳到卷"`，有 `#ch-ancient`、`#ch-now`、`#ch-future`，沒有 `aria-label="跳到階段"`，沒有頂部 `#stage-1`／`#stage-10` 連結。四個視口都一樣。

`#ch-ancient`、`#ch-now`、`#ch-future` 與 `#stage-1`…`#stage-10` 都在。古卷刻度是 01–05，今卷刻度是 06–10。四個視口的卷導覽、模式卡、案例、古卷刻度、今卷刻度，`scrollWidth − clientWidth` 都是 0，沒有停住時被切成半個字的晶片，晶片寬高都 ≥ 44。

360 暗色 headless 點擊（不是真機）：

| 動作 | 結果 |
| --- | --- |
| 頂部「卷一 古」 | 落在 `#ch-ancient`。標題「古」頂距離貼頂列底 88.6px |
| 古卷「01 史前」 | 落在 `#stage-1`。標題距離貼頂列底 65px |
| 總覽「閱讀人類起源」 | 進入 `/civilization/origins/` |
| 總覽層卡「人類起源」 | 進入 `/civilization/origins/` |
| 總覽「跳到今日切片」 | 進入 `/#slice`。標題「今日切片」距離貼頂列底 31.4px |

圖：`2026-10-23-chronicle-360-dark-volumes.png`、`2026-10-23-chronicle-360-dark-ch-ancient.png`、`2026-10-23-chronicle-360-dark-jump-ancient.png`、`2026-10-23-chronicle-360-dark-jump-stage-1.png`、`2026-10-23-civ-360-dark-cta-origins.png`、`2026-10-23-home-360-dark-slice-from-civ.png`。390 與淺色有對應的卷晶片、章扉、表。

### 3. 總覽人類起源只留一處

360 與 390、淺色與暗色：

- `<h3>人類起源</h3>` 有 1 個，在 `a.layer-card[href="/civilization/origins/"]`
- `.deep-time` 沒有 `/civilization/origins/`，也沒有「人類起源」
- 深時間卡是宇宙長河、地球生命。封面連結約 326×204
- 仍指向 `/civilization/origins/` 的三處：軸節點「起源」、軸按鈕「閱讀人類起源」、文明層卡
- 三張 `.volume-card` 在 `.volume-board`。沒有 `.chronicle-strip`
- 軸按鈕全文是「閱讀人類起源」「跳到今日切片」

圖：`2026-10-23-civ-360-dark-deeptime.png`、`2026-10-23-civ-360-dark-origins.png`，以及 390、淺色的同名檔。

## 執行卡（本席量到的）

| # | 項目 | 本席 |
| --- | --- | --- |
| 1 | 寬 ≤640 的全長 | 編年與總覽在 360／390、淺暗都打開了整頁 DOM。存圖是首屏、表、卷晶片、章扉、深時間、起源層卡、軸帶，不是六頁全長矩陣。H 只在 360 暗色做了溢流與碰撞抽查，另有從總覽點進 `/#slice` 的一張 |
| 2 | 零重疊 | 正典 §2.4 選擇器在這八張的捲動頂部回傳空。H 的 360 暗色也是空 |
| 3 | 品牌「文明編年史」 | 編年與總覽、360／390、淺暗：`aria-label` 五字，SVG `naturalWidth` 185×68、`complete`，`clipped()` 為假，正文沒有「编年史」。`<title>` 分別是「文明編年 — 文明編年史」「人類文明 — 文明編年史」。`og:site_name` 是「文明編年史」。特寫：`2026-10-23-civ-360-dark-brand.png` 與另外三張 360 字標 |
| 4 | 無頁面橫向溢出 | 上表八格，以及 H 360 暗色，`scrollWidth` 等於 `clientWidth`，`scrollingElement.scrollWidth` 不大於 `innerWidth + 1` |
| 5 | CI | #248 的 `check` 綠。見上 |

H 360 暗色抽查：沒有 `.civ-article`，頁不橫溢，正典碰撞 0 對，三張 `.volume-card`，字標 aria 五字，主按鈕「打開文明總覽」「跳到今日切片」。這不是 H 的全套閘。

## 觸控（點名主控）

360 暗色總覽，正典點名的盒子：

| 控制 | 量到的盒 |
| --- | --- |
| 搜尋、主題、語言 | 44×44 |
| 文明、編年、今天、開蒙 | 44×44 |
| 「閱讀人類起源」「跳到今日切片」 | 108×44 |
| `.axis-node` | 69×55.2，七顆 |
| `.pattern-axis .chip`、`.case-axis .chip` | 高 44，寬 161–216 |
| `a.layer-card` | 寬 328，起源／科技／城市高 354.5，未來卡高 110 |
| 編年 `.chronicle-nav .chip` | 四個視口都沒有寬或高 &lt; 44 |

相鄰間距腳本回報的 7 對，是同一個 DOM 同時命中 `.masthead` 與 `.chrome`（或 `.civ-nav` 與 `.chrome .chip`），中心距 0。那是選擇器重複，不是兩顆相鄰按鈕貼在一起。不同元素之間沒有量到邊緣間距 &lt; 8px 或中心距 &lt; 44px。

深時間卡裡的文字連結不在點名清單，正文行內連結依正典不量：`閱讀宇宙長河`／`閱讀地球生命` 約 78×19，`侏羅紀` 約 39×19，卡內 `h3 a` 約 134×24。封面連結與整張層卡已 ≥ 44。本席不把這些行內連結升成 `P0-TOUCH-44`。

字標連結高 28。正典點名的是版頭圖示，不是字標連結。不另計 Critical。

## 軸節點與 `clipped()`

總覽 360 暗色，`.deep-axis` 是內部橫滑：`overflow-x: auto`，可見盒 x＝16–344（寬 328），`scrollWidth` 571。

| 標籤 | lab 左–右 | 與可見軌 |
| --- | --- | --- |
| 宇宙、地球、起源、技術 | 全在軌內。技術的盒子右緣 336，距軌緣 344 還有 8px | 完整 |
| 城市 基建 | lab 348–417 | 與可見軌不相交（左緣在軌外 4px） |
| 今天 切片 | lab 429–498 | 整顆在軌外 |
| 未來 展望 | lab 510–579 | 整顆在軌外 |

正典 `clipped()` 對這三顆會回真，因為盒子的右邊大於 `innerWidth + 1`。休息畫面沒有切到半個字：城市的盒子從軌的可見右緣之外才開始。軸圖 `2026-10-23-civ-360-dark-axis.png`（以及 390、淺色）休息時看得見的是宇宙、地球、起源、技術。390 的同一組三顆同樣整顆在軌外。

本席不把這三顆軌外節點計成 `P0-CLIP` Critical。`P0-HSCROLL` 允許內部橫滑；`P0-HSCROLL-COLLIDE` 要擋的是停住時切成半個字。可見軌沒有切進「技術」，也沒有切進「城市」。窄屏把後面的節點放在橫滑溢位，記在 `P2-AXIS-DENSITY`／`P2-SWIPE-HINT`。編年頁沒有這條深時間軸，編年切片的 `clipped()` 部分切開是 0。

這條軸的 CSS 不在本 PR 的 diff 裡。全站閘仍然要看它。本席看過的休息畫面沒有半個字。未打開的視口不能據此寫成整條 `P0-CLIP` 已過。

## P0

覆蓋面寫「未測」的，不能當成該 P0 已過。Critical 只計下表裡記 FAIL 的 P0。目前沒有。

| ID | 這次 | 說明 |
| --- | --- | --- |
| `P0-OVERLAP` | 切片未見 FAIL | N、C 的 360／390 淺暗，以及 H 360 暗，正典腳本 0 對。其餘頁與視口未測 |
| `P0-CLIP` | 切片未見半字 | 表、卷晶片、章扉、字標、深時間卡、起源層卡沒有部分切開。軸上城市／今天／未來整顆在橫滑溢位，見上節，不計 Critical |
| `P0-HSCROLL` | 切片未見 FAIL | 上列切片 `scrollWidth` 不大於 `clientWidth + 1`。文章本身不再橫滑 |
| `P0-HSCROLL-COLLIDE` | 切片未見 FAIL | 卷晶片與階段晶片在 360／390 淺暗沒有半顆停在軌緣上；導覽 `scrollWidth` 等於 `clientWidth`。沒有做斜向滑，也沒有用手指把圓點從 01 滑到末顆。真機手勢算在 `TRAP-V08` |
| `P0-FIXED-WIDTH` | 切片未見 FAIL | 編年文章內沒有 `scrollWidth > clientWidth + 1` 的元素。頁級沒有被撐寬。選擇器路徑：無 |
| `P0-TOUCH-44` | 切片未見 FAIL | 點名主控見上。行內深時間連結不升 |
| `P0-CTA-COVER` | 切片未見 FAIL | headless 點卷、點階段 1、點「跳到今日切片」之後，標題在貼頂列下，間距 88.6／65／31.4，都 ≥ 8。沒有滾到頁尾，沒有點軸節點 |
| `P0-CTA-TARGET` | 切片未見 FAIL | 「閱讀人類起源」整句在，並進入 `/civilization/origins/`。「跳到今日切片」進入 `/#slice`。H 的「打開文明總覽」只在 DOM 裡讀到，沒有點 |
| `P0-Z-STACK` | 未測 | 沒有做暗角最深段的點擊攔截 |
| `P0-NAV` | 切片未見 FAIL | 360／390 的欄目晶片 ≥ 44，字標連回首頁的 aria 是五字。沒有把每個欄目點一遍查 404 |
| `P0-BRAND` | 切片未見 FAIL | 見執行卡。404、離線頁、新聞頁未開 |
| `P0-CONTRAST` | 未測 | 軸上年分的 computed 色是 `#c4a572` 在軸帶 `#161c24` 上，比值約 7.32:1。這是元素底色，不是軸圖暗角最亮段的像素。Noto 沒載入。不記 FAIL，也不記通過 |
| `P0-DARK-PAPER` | 切片抽樣 | 暗色頁底 `(14,20,28)`，章扉與軸帶 `(22,28,36)` 即墨 `#161c24`，章扉字 `#f7f1e6`。暗色層卡底是 `(42,35,27)`，字是淺色，不是紙底墨字；對比沒有在像素上判失敗。不把這一格寫成通過 |
| `P0-INK-TOKEN` | 切片抽樣 | 軸、章扉落在 `#161c24`。頁首、頁尾、模式卡五處沒有逐一抽完。本 PR 沒有改墨色 token |
| `P0-AXIS-NODES` | 切片未見碰撞 | 休息時可見的四顆標籤不相交，節點盒 69×55。`VP-LAND` 未測。後面三顆在橫滑溢位 |
| `P0-ROUTE` | 切片未見 FAIL | N、C 直連有正文。從 C 進起源頁與 `/#slice` 有正文。L、A、404 未開 |
| `P0-DOM-EXPECT` | 切片未見 FAIL | C 有 `.axis-title`、`.deep-axis`、`.axis-cta`、三張 `.volume-card`、`.pattern-axis`、`.case-axis`。C 沒有 `.chronicle-strip`，依 2026-10-22 重鎖不計 FAIL。N 的三個卷錨與 `#stage-1`…`#stage-10` 都在。H 的必有骨架只在 360 暗色抽到軸、CTA、三張卷卡，沒有逐項對完 `#slice` 以外的全套，H 不寫成整條通過 |
| `P0-RENDER-ERR` | 切片未見 FAIL | 八次載入加上點擊流程，`pageerror` 0。沒有瀏覽器 console 面板截圖，所以不把整條寫成通過 |
| `P0-NEWS-CHROME` | 未測 | 沒有開新聞頁 |
| `P0-LEARN-STACK` | 未測 | 沒有開 `/learn/` |
| `P0-CHRONICLE-PAGE` | 切片未見 FAIL | N 的 360／390 淺暗：頁不橫滑，卷與階段晶片不相交，點階段 1 後標題在貼頂列下。768 與 1280 未測。不是每一張模式卡都有近拍 |

沒有 P0 命中。Critical＝0。P0 不可豁免。這張票不把任何 P0 改寫成 P1。

## §7.3

執行卡是下限。全站閘只靠本卡、沒有第 7.3 節其餘證據，不得判 PASS。這次沒有交齊的包括：

1. 六頁 × 淺暗 × 360／390／768／1280／1440，以及 H／C 的 414 與 1024。這次幾何集中在 N 與 C 的 360／390 淺暗。
2. 事故同框的其餘點擊：N 的模式卡近拍、L、A 兩篇、`VP-LAND`。C 的「跳到今日切片」與「閱讀人類起源」有 headless 點擊，不是真機。
3. 每條 P0 各一張 ≤640 的對應圖。上面只覆蓋本 PR 碰到的編年與總覽。
4. `TRAP-V02` 只在 N／C 的八個休息頂部，加上 H 的 360 暗色，跑過正典腳本。
5. 間距 &lt; 8px 的盒子邊線圖：結構選擇器在休息頂部沒有相交。
6. console 介面截圖。只有自動化 `pageerror` 為 0。
7. Lighthouse 行動端 LCP／INP／CLS。未跑。#198 的 `P1-PERF` 豁免寫明下一次走本閘時，Home 與 Civilization 的 M、4G LCP 改按 P0 覆核。本席沒有重跑，這兩列記未測，不計入 Critical＝0，也不能當成已壓到 2.5s。
8. 真機短片。`TRAP-V08`＝FAIL。見上。不是 DEFERRED。
9. 本票即檢測席紀錄。

## 陷阱

| ID | 這次 |
| --- | --- |
| `TRAP-V01` | 未做與上一穩定版的全長 diff |
| `TRAP-V02` | N／C 八格與 H 360 暗，腳本回傳空 |
| `TRAP-V03` | 未把 absolute／fixed 與負 margin 在 M、T、D 對完 |
| `TRAP-V04` | headless 點了卷、階段 1、兩顆總覽主按鈕之一與「跳到今日切片」。沒有頁尾，沒有點軸節點 |
| `TRAP-V05` | 未做斜向滑。階段晶片在休息版位已經整顆在內 |
| `TRAP-V06` | 未另注入當日最長標題 |
| `TRAP-V07` | 未在軸圖最亮段取樣 |
| `TRAP-V08` | **FAIL** |
| `TRAP-V09` | 未看網址列展開與收合 |
| `TRAP-V10` | 未做瀏海與手勢條 |

## 備註（不進 Critical）

- `P2-SWIPE-HINT`：360 暗色總覽，技術盒子右緣 336，軌的可見右緣 344，下一顆「城市」從 348 才開始，沒有露出 8px。軌端留了 8px 空軌。不擋上線。
- `P2-AXIS-DENSITY`：窄屏仍是七顆橫排，靠內部橫滑才看得到後三顆。
- `min-width: 960px` 的深時間格從三欄改成兩欄。360／390 仍是一欄。768／1280 未測。
- 深時間行內連結矮於 44。點名主控沒有矮於 44。

## 本席不做的事

不合併 #248，不部署，不改產品碼。這是一席的 R1 票。三席缺任一席，或任一席 FAIL，整閘 FAIL。Critical＝0 不能把缺片或未測矩陣折成 PASS。
