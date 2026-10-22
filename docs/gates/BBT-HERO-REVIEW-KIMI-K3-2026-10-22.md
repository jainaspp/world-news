# 文明編年史 · 開場 Hero 過閘票（Kimi K3 席）

- 文件 ID：`BBT-HERO-REVIEW-KIMI-K3-2026-10-22`
- 席次：**Kimi K3**（pick 之後的站級閘，不是創作者自評）
- 日期：2026-10-22
- 審閱對象：PR [#186](https://github.com/jainaspp/world-news/pull/186)／分支 `cursor/bbt-hero-opening-eb86`（GM 採 PP O「是旦」之後的實作）
- 上游：`BRIEF-GM-ADOPT-2026-10-21`、`PICK-COMPARE-2026-10-21`、`docs/gates/SITE-MAJOR-UPDATE-GATE.md`、`docs/hero/BBT-HERO-KIMI-K3-SPEC-2026-10-21.md`
- 範圍：只讀。不改 Hero／App 生產碼、不部署、不 merge。
- 總評：**FAIL**（Critical = 4）

---

## 1. 總評

**FAIL。**

Critical 不是 0。四條都擋住本席 PASS：新的「進入今日切片」把 `#slice` 標題壓在貼頂列下面約 72px；390 寬的 `#civ` 橫滑軌在靜止時切到「城市」；新銅金主按鈕對比 4.34:1；SSR boot 在 `playing` 時讓每一句都是可見的。

Hero 區塊本身沒有壓到 `#civ`、監測鐘或「開蒙」四個字。360 與 390 沒有整頁橫向捲軸。基底是墨紙漸層，不是原型純黑 `#05060a`。沒有 three.js、gsap、lenis。獨白沒有寫進新聞或懶人包。`prefers-reduced-motion: reduce` 直接進 settled。這些不能把 Critical 折成 0。

本席重跑 `tests/heroOpening.test.ts`：7 例通過。那 7 例鎖節拍、紅線、SSR 字串和「CSS 裡有 `#161c24`」。它們沒有断言 `#slice` 的 `scroll-margin`，也沒有断言 boot 會清掉 `data-on`。測試綠燈不等於這張票 PASS。

---

## 2. Critical 清單

任一條成立，整則 FAIL。本席不自行豁免。

| ID | 等級 | 一句話 | 引入 |
| --- | --- | --- | --- |
| `K3-P0-SLICE` | Critical | 390×844 點 Hero「進入今日切片」後，`#slice` 的 h2「今日切片」在貼頂列下緣之上 71.9px（`scroll-margin-top: 0px`） | 本 PR 的主 CTA。軸上舊按鈕「跳到今日切片」同一落點，同一缺陷 |
| `K3-P0-CIV-EDGE` | Critical | 390 寬 `#civ` 橫滑軌靜止時，「城市」右半超出軌右緣（格 336–404，軌右 374），「今天」「未來」整格在軌外 | 既有 `@media (max-width: 640px)` 的 `.milestones`（本 PR diff 未改這段）。按任務書，≤390 的 `#civ` 溢位仍是 Critical |
| `K3-P0-BRASS` | Critical | `.hero-btn-brass` 實算 `#161c24` 在 `#9a7b4f` 上，對比 **4.34:1**（正文門檻 4.5）。字級 0.95rem、字重 700，不是大字 | 本 PR 新按鈕。與既有 `.axis-hero .btn-brass` 同色 |
| `K3-P0-SSR` | Critical | SSR 標記每句 `data-on="true"`。boot 只把 `data-mode` 改成 `playing`，不清 `data-on`。CSS 規定 playing 且 `data-on="true"` 的句子 opacity 為 1，同時藏起 CTA | 本 PR 的 `HERO_BOOT` |

Hero 與 `#civ`、監測鐘的盒子沒有相交（見第 7 節）。`K3-P0-CIV-EDGE` 是 `#civ` 軌內切字，不是 Hero 蓋住軸。

---

## 3. 檢測 list

覆蓋代號：`M390` = 390×844，`M360` = 360×780，`M320` = 320×568，`D1280` = 1280×800。主題除另註外為淺色。播放／settled／reduced 都在 Vite dev（`http://127.0.0.1:5173/`，headless Chrome）上量過。SSR 用與 boot 同構的靜態夾具，不經 React。

### 3.1 P0

| ID | 項目 | FAIL 條件 | 覆蓋 | 結果 |
| --- | --- | --- | --- | --- |
| `K3-P0-SLICE` | Hero 主 CTA 進 `#slice` | 點擊後 h2 沒有整句落在 `.chrome` 下緣之下，間距 < 8px；或 `scroll-margin-top` 仍是 0 | M390 必點 | **FAIL**。chrome 底 87，h2 頂 15.1，間距 −71.9。規格寫「沿用 `--civ-anchor-offset`」，`#slice` 沒有用這個變數 |
| `K3-P0-CIV-EDGE` | `#civ` 在 ≤390 不切半個節點字 | 靜止軌把節點標籤切成半個字，或最後節點不可見又不能靠完整一格讀完 | M390、M360 | **FAIL**。390：宇宙／地球／起源／技術在軌內；城市跨出右緣；今天、未來在軌外（`scrollWidth` 548，`clientWidth` 358） |
| `K3-P0-BRASS` | Hero 主按鈕對比 | 按鈕字 < 4.5:1（未達大字門檻時） | M390 實算 computed color | **FAIL**。4.34:1 |
| `K3-P0-SSR` | 逐句浮現的首繪 | 首次訪客在 React 接管前看見全部句子，或 CTA 在全文可見時被藏起 | SSR 夾具，motion 允許、未看過 | **FAIL**。首繪三句 opacity 都是 1、CTA `visibility: hidden`、`data-mode=playing`。4 秒後若沒有 `data-hero-boot`，模式被打回 settled |
| `K3-P0-HERO-CIV` | Hero 不壓 `#civ` | 兩盒相交超過 1px（父子包含除外） | M390、M360、D1280 | **PASS**。390：Hero 底 800、`#civ` 頂 800，垂直重疊 0 |
| `K3-P0-HERO-CLOCK` | Hero 不壓監測鐘 | 與 `.bulletin-clock` 相交超過 1px，或把鐘改成恐嚇秒錶 | M390、M360 | **PASS**。390：鐘頂 1077.5，在 Hero 之下。文案仍是「監測／此為編輯寫定的監測刻度」。本 PR 未改鐘模組 |
| `K3-P0-HERO-LEARN` | 「開蒙」不被 Hero 裁切或蓋住 | 主欄目「開蒙」半個字，或與 Hero 相交 | M390、M360、M320 目視 | **PASS**（字形）。390 晶片在 `.chrome` 內，文字「開蒙」完整，不與 Hero 相交。觸控高度見 P1 |
| `K3-P0-HERO-CLIP` | Hero 句子不被 `overflow: hidden` 裁掉 | 任一 `.hero-main` 被祖先裁切，或肉眼半個字 | M390 播放與 settled、M360、M320、D1280 | **PASS**。七句 `clipped=false`。320 高 568 時 Hero 增高到 762，沒有把句子裁在 `min-height` 裡 |
| `K3-P0-HSCROLL` | 360／390 整頁不橫向滾 | `scrollWidth > clientWidth + 1` | M360、M390、D1280 | **PASS**。三個寬度都是相等。M320 量到 `scrollWidth` 332、`clientWidth` 320、`innerWidth` 332；探出的盒子是編年圓點與軸節點（在各自橫滑軌內），不是 Hero 句子。不另開一條 Critical |
| `K3-P0-INK` | 墨紙，禁止原型純黑換皮 | Hero 底使用 `#05060a`，或亮暗被刷成另一套站 | M390 目視 + CSS | **PASS**。`background` 為 `#1c2431 → #161c24 → #121820` 徑向漸層。Hero 區塊沒有 `html.dark` 覆寫，也沒有 `#05060a` |
| `K3-P0-TONE` | 宅幽默只留在 Hero | 新聞、導讀、懶人包、`HOME_INTRO` 出現「砰／原子湯」這類口吻 | diff 對 `8b04723` | **PASS**。`shared/homeCopy.ts` 與新聞模組不在本 PR。七句通過既有粒子掃描（測試在） |
| `K3-P0-REDUCE` | `prefers-reduced-motion: reduce` 不播 15.6 秒 | 仍進入 playing，或 CSS transition 還在跑 | M390 emulate reduce | **PASS**。約 0.8 秒時已是 `settled`／`handoff`，七句 opacity 1。CSS 有 reduce 區塊把 transition 關掉 |
| `K3-P0-DEPS` | P0 不用 three／gsap／lenis | `package.json` 新增這三個，或 Hero 改走 WebGL | 依賴與元件 | **PASS**。依賴仍是 react、react-dom、minisearch。動畫是一個 rAF + CSS transition |
| `K3-P0-TOUCH-HERO` | Hero 可點盒 ≥ 44×44 | 跳過、重播、兩顆 CTA、提示任一邊 < 44 | M390 播放 | **PASS**（Hero 控件）。播放中「跳過開場」81.2×44。CTA `min-height: 44px`。開蒙晶片不是這條 |

### 3.2 P1

P1 不計入上面的 Critical 數目。未清之前，本席仍然不建議 merge 上線。

| ID | 項目 | FAIL 條件 | 覆蓋 | 結果 |
| --- | --- | --- | --- | --- |
| `K3-P1-BOOT-RACE` | React 替換 SSR 時不重播、不閃 | `createRoot().render` 把已開始的開場抹掉再從 0 播；或 4 秒保險與 React 對打 | 讀 `src/main.tsx`、`HeroOpening.tsx` | **未過**。首頁是 `createRoot` 整棵替換，不是 `hydrateRoot`。boot 的 4 秒保險在 React 慢於 4 秒時會先 settled，接著被客戶端 `revealed=0` 藏起。修 `data-on` 只能消掉「全文閃現」，消不掉「計時器重頭」 |
| `K3-P1-NAV-TOUCH` | 主欄目觸控 ≥ 44 | 「開蒙」可點盒高 < 44 | M390 | **未過，既有**。主導航「開蒙」44×36；頁內另有一顆 32×31。Hero 沒有改 `.chrome .chip`。字形完整，所以不升成 Critical |
| `K3-P1-ERA` | 三章色溫做成 token，不換皮 | 古暖金／今冷藍／未來紫黑被做成整站底，或完全沒有變數、無法按章節掛 | 元件與 CSS | **未做**。Hero 把銅金 `#c4a572`、冷藍點 `rgb(158,192,239)` 寫死在 canvas。沒有未來紫黑。基底仍是墨。可以後加章節變數，不必換皮 |
| `K3-P1-CARDS` | 8 科卡只做捷徑 | `/learn/` 被收成 8 張卡、萬有地圖或樹消失 | diff + `shared/learnPage.ts` | **本 PR 未做，也沒有縮窄**。開蒙殼仍是「開蒙 · 森羅」。Vite 的 `/learn/` 回的是 SPA shell，不是 Functions 頁；本席依原始碼與 diff 判斷 |
| `K3-P1-LCP` | 手機 LCP ≤ 2.5s | 4G 節流下 LCP > 2.5s，或 Hero 用未設尺寸的大圖當 LCP | 未做實驗室 | **未實測**。構造上 Hero 無圖、無新依賴；Noto 在 `load` 之後 8 秒才插入。不能簽過，也不能簽失敗 |
| `K3-P1-CANVAS-LATE` | 星野不得拖主執行緒 | settled 之後 rAF 仍全開，低階手機掉幀 | 讀迴圈 | **未能量 INP**。出畫面與分頁隱藏會停。settled 且人還看著 Hero 時，星星繼續閃。見規格自陳的第 6.4 點 |

### 3.3 P2

| ID | 項目 | FAIL 條件 | 覆蓋 | 結果 |
| --- | --- | --- | --- | --- |
| `K3-P2-GHOST-BORDER` | 鬼按鈕邊框非文字對比 | 邊框合成色對墨底 < 3:1，而文字本身已夠 | 計算 | 邊框 `rgba(232,228,220,0.35)` 合成後約 **2.79:1**。字是 13.5:1。建議，不擋 |
| `K3-P2-DUP-CTA` | 同一屏兩次「打開文明總覽」 | 讀者分不清 Hero CTA 與軸 CTA | M390 目視 | Hero 與 `#civ` 各一顆，文案相同、目的地相同 |
| `K3-P2-FOCUS` | 重播鈕的 Tab 順序 | 視覺在右上、Tab 在文末 | 讀 DOM 順序 | 跳過／重播在文案與 CTA 之後。`display: none` 的那顆不在無障礙樹 |
| `K3-P2-ARIA` | 逐句是否要朗讀 | 螢幕閱讀器一次讀完七句，或完全讀不到 | 讀 markup | 未揭示的句子只是 opacity 0，仍在無障礙樹。這是對的預設。沒有 `aria-live`。可接受 |
| `K3-P2-SESSION` | 已看旗標的壽命 | 用 localStorage 把開場永久關掉，或每格都自動播 | 讀 `wn_hero_seen` | `sessionStorage`。關分頁會再播。規格已寫明，留給合議，不必在這張票改 |

---

## 4. 必評項

### 4.1 獨白口吻

七句是書面語，宅幽默只在旁白裡：「連『甚麼都沒有』，也還沒有。」「其實沒有聲音：聲音需要空氣。」「一顆藍色小石頭學會了下雨。」收在「先看見尺度，再讀今天。」，接得上軸的導語，沒有口語助詞。

本 PR 的 diff 只有 Hero、首頁掛載、規格與測試。`HOME_INTRO`、導讀、懶人包沒有這些句子。口吻沒有滲出 Hero。

### 4.2 逐句浮現、可跳過、無障礙

React 開發路徑是對的：播放約 1.2 秒時只有第 1 句 opacity 1，其餘為 0，版位仍在，所以不會為了浮現去推開 `#civ`。跳過鈕在播放中是 81×44 的真按鈕。reduced-motion 不播。

生產路徑不是這條。Functions 先吐 SSR：每句 `data-on="true"`，boot 再把模式改成 playing。同一條 CSS 讓「playing + data-on=true」保持可見，並把 CTA 藏起來。本席用同構夾具量到首繪三句 opacity 全是 1。`src/main.tsx` 用 `createRoot().render` 換掉 `#root` 之後，客戶端從 `revealed=0` 再藏起來重播。創作者附的截圖是 Vite，看不到這段 SSR。

無障礙樹裡句子一直都在，canvas 是 `aria-hidden`。跳過沒有把焦點移到軸上，列在 P2。

### 4.3 星空、P0 canvas、LCP、reduced-motion

P0 是 2D canvas：最多約 210 顆星、DPR 上限 2、沒有 `shadowBlur`、用徑向漸層做光。沒有 three.js。這符合 GM「P0 輕量、P1 才是粒子大爆炸」的約束。

reduced-motion 畫一幀靜態完成態，不開 rAF。本席 emulate 之後直接看到 settled。

LCP 沒有做 4G 實驗室。Hero 不是一張 hero 圖。字型在載入事件 8 秒後才插入，所以第一屏文字先走系統字。canvas 在 React 掛上之後才畫，SSR 的 canvas 是空的。這些是構造說明，不是 LCP 通過證明。

### 4.4 與 chrome、軸、監測鐘、`#slice`

掛載順序是對的：`.chrome` → `.hero-opening` → `.axis-mount`／`#civ` → `.bulletin-clock` → 編年 → `#slice`。只在 `poeticAxis` 的純首頁出現。Hero 用 `h2`，軸的 `h1` 還在。

盒子：Hero 與 `#civ` 相接，不相交；與監測鐘隔著整段軸。負 margin `0 -16px` 在 360 與 390 沒有把頁面撐出橫向捲軸。

衝突在點擊之後。Hero「進入今日切片」與軸「跳到今日切片」都是原生 `#slice`。首頁沒有把 `#slice` 放進 `--civ-anchor-offset`。`columns.js` 的 `placeHashTarget` 只綁編年階段、星圖和 `.chronicle-nav`，而且整個偏移區塊還要求頁上有 `.civ-reveal` 或 `.chronicle-nav`。首頁 Hero 連結不在那裡。貼頂列高約 87px，標題頂在 15px，字在列的後面。這是 `K3-P0-SLICE`。

`#civ` 內部是另一件事：640px 以下軌道改成橫滑，六格 `min-width: 68px`，390 的可視寬約 358，裝不下。靜止時「城市」被切半。Hero 沒有改這段 CSS，也沒有用負的 margin-top 去壓軸（相鄰規則只把軸的 `margin-top` 設為 0）。任務書仍把這條算 Critical。

### 4.5 墨紙與三章色

Hero 底是墨，不是 `#05060a`。紙色字 `#f7f1e6`／`#e8e4dc`、旁白 `#a8b0ba`、銅金字 `#c4a572` 對 `#161c24` 都高於 4.5（約 15.2、13.5、7.8、7.3）。失敗的是按鈕底 `#9a7b4f` 上的墨字。

古暖金與今冷藍只出現在星與地球點上，沒有未來紫黑，也沒有章節 CSS 變數。做成 token 而不換整站皮，是做得到的。這張 PR 還沒做。列 P1，不列 Critical。

### 4.6 八科卡與開蒙

本 PR 沒有 8 張學科卡，也沒有改 `shared/learnPage.ts`。首頁「開蒙」仍指向 `/learn/`。樹與「開蒙 · 森羅」還在。Hero 選擇器都掛在 `.hero-opening` 上，除了「Hero 的下一個軸去掉上邊距」之外，不會套到開蒙頁。

8 張卡若要做，只能當萬有地圖的捷徑，不能換成一組封閉課。那是 GM P0 順序裡的後一步，不是這張 Hero PR 已經犯下的縮窄。

### 4.7 手機 safe、裁字、overflow

390 與 360：Hero 句子、標題「從宇宙到今天」、kicker「文明編年史 · 開場」都完整。跳過鈕底緣大約在 145，kicker 頂在 150，垂直空隙約 5px，兩盒不相交。`overflow: hidden` 沒有裁到句子；section 會跟著內容長高（320×568 時高 762，大於 `84svh` 的下限）。

沒有 `env(safe-area-inset-*)`。Hero 在貼頂列下面，不貼瀏海。本席沒有用真機劉海複測。

320 的「開蒙」晶片盒有探出 `.chip-scroller` 的測量；同一張首屏截圖仍能讀到「開蒙」四畫。不把這一條升成 Critical。

---

## 5. 開工建議

維持現在的 `HeroOpening`、七句與 2D canvas。不要改掛 three，不要為了過閘去 redeploy Functions。

### P0：最小可合併（檔案級）

1. `shared/heroOpening.ts`  
   boot 在把 `#hero-opening` 設成 `playing` 時，把每條 `.hero-line` 的 `data-on` 設成 `false`（或乾脆不要在 SSR 預設 `data-on="true"`，改由 settled 的 CSS 顯示）。4 秒保險保持「沒有 `data-hero-boot` 才回到 settled」。補一條測試：playing 的 boot 字串必須清掉 `data-on="true"`。

2. `src/App.css`  
   給 `#slice`（以及 `.slice-head`）設 `scroll-margin-top: var(--civ-anchor-offset)`。Hero「進入今日切片」、提示「向下滾動，開始編年」、軸上「跳到今日切片」會一起落到貼頂列下。門檻是 h2 頂與 `.chrome` 底的間距 ≥ 8px。本席 390 的實測是 −71.9。

3. `src/App.css` 的 `.hero-btn-brass` 與既有 `.axis-hero .btn-brass`  
   一起改，避免同一屏兩顆銅金按鈕不同色。`#161c24` 在 `#9a7b4f` 上是 4.34:1。改成紙色字更差：`#f7f1e6` 在同一底上是 3.51:1。把底提高亮度可以讓墨字過 4.5（同色相約 `rgb(170,136,87)` 時約 5.20:1）。數字是計算值，改完要用 computed style 再量一次。

4. `src/App.css` 裡 `@media (max-width: 640px)` 的 `.deep-axis`／`.milestones`  
   這不是 Hero 新增的規則。≤390 的 Critical 仍要它：靜止時右緣必須是完整的一格，不能切半個「城市」。內距、snap 或讓六點在 390 裡縮進格子，三選一。不要為了修半字把軌道重新疊回編年圓點。

### P1：延後

- three.js／粒子大爆炸／環境聲。要另一次動畫合議，並且 click-to-play。這張 P0 不準先上。
- 章節 token：古暖金、今冷藍、未來紫黑。只做章節，頁底保持 `#161c24`。
- `/learn/` 的 8 科捷徑。每張卡連到現有樹節點，地圖與樹留下。
- 互動橫軸的 scroll-snap 升級。現有橫滑先把半字修掉。
- settled 之後停掉星星的 rAF。
- `createRoot` 整頁替換造成的開場重播（`K3-P1-BOOT-RACE`）。可以之後再談 hydrate，不必擋在色與錨點後面，但要寫進已知限制，直到 boot 與客戶端的初始狀態一致。

### 不要做

- 不部署、不開 Workers Paid、不為這包 flush Functions。
- 不用原型整站換皮，不刪新聞，不把開蒙收成 8 張卡。
- 不把 Hero 的幽默寫進導讀或懶人包。
- 不改監測鐘的規則。

---

## 6. 過關票

Kimi K3 席對 PR #186 投 **FAIL**；改投 PASS 的條件只有一句：390 寬點「進入今日切片」後「今日切片」整句落在貼頂列下至少 8px、`#civ` 靜止軌不切半個節點字、Hero 銅金主按鈕對比至少 4.5:1、SSR 的 playing 首繪不得在 `data-on="true"` 下把七句同時顯示。

---

## 7. 證據（本席實測，不是規格自評）

環境：分支 `cursor/bbt-hero-opening-eb86`，Vite `127.0.0.1:5173`，headless Chrome。裝置寬度含 320×568、360×780、390×844、1280×800。淺色為主；reduced-motion 用模擬。SSR 夾具複寫 `renderHeroOpening` 的 `data-on="true"`、同一條 boot、以及 `.hero-opening[data-mode="playing"] .hero-line[data-on="true"] { opacity: 1 }`。

| 檢查 | 數字 |
| --- | --- |
| 390 播放約 1.2s | `playing`／`singularity`。第 1 句 opacity 1，第 2–7 句 opacity 0。`scrollWidth` = `clientWidth` = 390 |
| 390 settled | `settled`／`handoff`。Hero 高 709。底 800，`#civ` 頂 800，鐘頂 1077.5 |
| 390 點 Hero 銅金鈕 | hash `#slice`。chrome 底 87，h2 頂 15.1，間距 −71.9，`scroll-margin-top` 0 |
| 390 點軸「跳到今日切片」 | 同一組數字，間距 −71.9 |
| 390 `#civ` 軌 | 軌 16–374，`scrollWidth` 548／`clientWidth` 358。城市格 336–404 |
| 360 settled | 無整頁橫向捲軸。Hero 與 `#civ` 相接（底 793.5／頂 793.5） |
| 390 reduce | 直接 `settled`／`handoff` |
| 1280 settled | Hero 在欄內（左 126.5、右 1138.5），無整頁橫向捲軸 |
| SSR 夾具首繪 | `mode=playing`，三句 `on=true`、opacity 1，CTA hidden |
| SSR 夾具 4.2s、無 `data-hero-boot` | `mode=settled`，CTA visible，句子仍全可見 |
| 銅金按鈕 | computed `rgb(22,28,36)` on `rgb(154,123,79)` = 4.34:1 |
| 單元測試 | `tests/heroOpening.test.ts` 7／7 通過 |

截圖只留在這次審閱的暫存，不進本 PR。規格目錄 `docs/hero/shots/` 是創作者在 Vite 上的自評，沒有 SSR 首繪，也沒有點進 `#slice` 之後的貼頂列。

---

署名：**Kimi K3 席**  
2026-10-22  
票：FAIL  
本文件不授權 merge，也不授權部署。站級重大更新閘仍要三席與 GM 簽字；Functions 配額恢復之前不得為這包 redeploy。
