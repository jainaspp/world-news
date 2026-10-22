# 文明編年史 · 開場 Hero 過閘（Grok 4.7）

| 欄位 | 內容 |
| --- | --- |
| 文件 ID | `BBT-HERO-REVIEW-GROK-4.7-2026-10-22` |
| 日期 | 2026-10-22 |
| 檢測席 | **Grok 4.7**（獨立席，未與 Kimi K3、GLM 5.3 對稿） |
| 對象 | PR [#186](https://github.com/jainaspp/world-news/pull/186) · 分支 `cursor/bbt-hero-opening-eb86`（GM 採 Kimi K3 軌，PP O「是旦」之後） |
| 上游 | `BRIEF-GM-ADOPT-2026-10-21`、`PICK-COMPARE-2026-10-21`、`docs/hero/BBT-HERO-KIMI-K3-SPEC-2026-10-21.md`、`docs/gates/SITE-MAJOR-UPDATE-GATE.md` |
| 性質 | 只讀席審。不改 Hero／App 行為、不部署、不合並、不開 Workers Paid |
| 總評 | **FAIL** |

本席不推翻「要有開場」這條方向。七句書面獨白、墨紙、2D canvas、可跳過、reduced-motion 預設走靜態，這些選擇站得住。FAIL 是因為首訪生產路徑的開場是壞的，主按鈕把「今日切片」標題送進黏性版頭底下，星野在幾像素的高度變化裡整片重抽。Critical 未清零，不能當過閘，也不能當准上線。

---

## 1. 總評

**FAIL。** Critical = 3。另有 1 條站級 P0（銅金按鈕對比）依正典同樣擋住簽字。

必改（清掉才能改判 PASS）：

1. **C-SSR-BOOT** — 生產 HTML 的 boot 沒有把句子藏起來。首繪是七句全文，CTA 被藏起，跳過按鈕沒有動作。React `createRoot` 接著把這頁拆掉，從頭再播 15.6 秒。
2. **C-SLICE-COVER** — 390 寬按下「進入今日切片」，`#slice` 的「今日切片」整段在黏性版頭下面（標題頂 y=15，版頭底 y=87）。`scroll-margin-top` 是 0。規格寫已沿用 `--civ-anchor-offset`，不成立。
3. **C-STAR-RESHUFFLE** — 畫布高度 709→703（6px）就用 `Math.random()` 重鋪星。手機網址列改 `svh` 時星野會跳。這是爛動畫，不是風格。
4. **P0-CONTRAST-BRASS** — 「進入今日切片」實測 `#161c24` 字在 `#9a7b4f` 底，對比 **4.34:1**，低於按鈕字 4.5:1。色對與既有 `.axis-hero .btn-brass` 相同，所以不用它否定敘事；新的首屏主按鈕仍要過線。

不計入 Critical、本席實測通過的部分：360／390／1280 靜止首屏，Hero 與 `#civ`、`.bulletin-clock`、開蒙連結不相交；頁面沒有橫向捲軸；Hero 句子沒有被 `overflow: hidden` 裁掉；沒有 `#05060a`、沒有 three.js／gsap／lenis；`prefers-reduced-motion: reduce` 的預設路徑直接 settled，canvas 兩幀相同。

---

## 2. Critical 清單

任一條維持，整則維持 FAIL。

### C-SSR-BOOT · 首訪開場先演完，再被拆掉重播

FAIL 條件：有動作偏好的首次造訪，第一幀看不到「逐句浮現」，或看到全文時 CTA 不能點、跳過沒有反應，然後客戶端再把句子藏起重播。

實測（`renderHeroOpening()` 的 SSR 標記＋本分支 `App.css`，390×844，boot 跑完、React 尚未掛上）：

| 項 | 結果 |
| --- | --- |
| `data-mode` / `data-phase` | `playing` / `singularity` |
| 七句 `data-on` / opacity | 全部 `true` / **1** |
| `.hero-cta` | opacity 0，**visibility: hidden** |
| 按下「跳過開場」 | 模式仍是 `playing`（SSR 按鈕沒有監聽） |
| 約 4.5 秒、React 未寫 `data-hero-boot` | 落到 `settled` / `handoff`，CTA 恢復可見 |

原因在 CSS，不在想像：

```3572:3573:src/App.css
.hero-opening[data-mode="playing"] .hero-line { opacity: 0; transform: translateY(10px); }
.hero-opening[data-mode="playing"] .hero-line[data-on="true"] { opacity: 1; transform: none; }
```

SSR 每一句都是 `data-on="true"`。boot 只改 `dataset.mode` 與 `dataset.phase`，沒有把 `data-on` 清掉。較具體的那條規則贏，句子保持可見。CTA 的 playing 規則卻會把按鈕藏起來。

客戶端接著用 `createRoot` 換掉 `#root`（`src/main.tsx`），不是 hydrate。首次造訪的 React 狀態是 `revealed = 0`。已畫出的七句會消失，再按 0.6s／3.3s／…／15.6s 長回來。規格第 3 節寫 boot「杜絕全文閃一下」，與這段標記相反。

Vite 開發首屏沒有這段 SSR，所以 PR 裡的截圖看不到。生產路徑走 `injectHomeShell`，Hero 在 `#root` 裡面。這是上線路徑，不是邊角。

修法（檔案級，不必改架構）：boot 在改 `playing` 的同一刻把每句 `data-on` 設為 `false`，並替 `[data-hero-skip]` 掛上與 React 相同的結束動作（settled、寫 `wn_hero_seen`）。這樣第一幀就和 React 的起點一樣，`createRoot` 替換不再把全文拆掉。

### C-SLICE-COVER · 主按鈕把切片標題蓋在版頭下

FAIL 條件：手機 ≤390，由 Hero 進入 `#slice` 後，「今日切片」或緊接的說明被黏性 `.chrome` 蓋住超過 1px。

實測（390×844，先按「跳過開場」確認客戶端跳過有效，再按「進入今日切片」）：

| 量 | px |
| --- | --- |
| `.chrome` 底 | 87 |
| `#slice h2` 頂 / 底 | 15 / 36 |
| `.slice-note` 頂 | 40 |
| h2 與版頭的間隙 | **−72** |
| `#slice` 的 `scroll-margin-top` | **0px** |
| `location.hash` | `#slice` |

標題整段在版頭裡。說明行的開頭也在版頭裡。版頭底色是 `color-mix(... 92%, transparent)`，字不可讀。

Hero 與軸的靜止關係是好的：Hero 底到 `#civ` 頂的間隙是 0（相貼，相交不超過 1px），`#civ` 到監測鐘 20px，版頭底到 Hero 頂 4px。開蒙連結留在版頭裡，不與 Hero 相交。橫向 `scrollWidth === clientWidth`（360 與 390）。這三塊的「Hero 壓住它們」不成立。壞的是 Hero 自己的主出口。

`--civ-anchor-offset` 現為 220px，而且只用在 `.civ-page` 的錨點。首頁 `#slice` 沒有用它。修的時候用「版頭高度＋約 16px」（這次實測版頭 87px），不要把 220px 原樣抄上首頁，否則會多推出一大段空白。軸上既有的「跳到今日切片」是同病；Hero 把它做成首屏主按鈕，這條就要在本閘清掉。

### C-STAR-RESHUFFLE · 星野隨高度重抽

FAIL 條件：Hero 仍在視口內時，高度只變一點，星的位置整片換掉。

`ResizeObserver` 每次都呼叫 `buildStars()`，座標來自 `Math.random()`。實測 settled、390 寬：畫布 390×709 時亮點樣本是 `(60,22) (316,22) (74,34)…`；視口高度 844→700 後畫布變成 390×703，亮點變成 `(348,8) (44,34) (158,34)…`。6px 高度，星野換了一套。

`min-height: clamp(430px, 84svh, 780px)` 會跟手機網址列一起變。這不是「粒子在飄」，是背景重骰。規格寫的慢速漂移，程式裡沒有位移，只有透明度閃爍；閃爍本身可以留，重骰不行。

修法：用固定種子鋪星；寬度沒變就不要重鋪；高度變了只改畫布緩衝，讓既有星留在原比例位置。

---

## 3. 檢測清單

覆蓋欄：M360 = 360×800，M390 = 390×844，D = 1280×800。主題有寫才跑了暗色。工具是 headless Chrome 對本分支 Vite（`http://127.0.0.1:5173/`）與 SSR 片段。不是實機。桌面 headless 的幀時間不能代替低階手機。

### 3.1 P0（＝本席 Critical，外加對比）

| ID | 項目 | FAIL 條件 | 覆蓋 | 結果 |
| --- | --- | --- | --- | --- |
| `C-SSR-BOOT` | 首訪逐句與可跳過 | 見第 2 節 | M390 生產 HTML 路徑；桌面同一標記 | **FAIL** |
| `C-SLICE-COVER` | Hero → `#slice` | 見第 2 節 | M390 淺色，實點主按鈕 | **FAIL** |
| `C-STAR-RESHUFFLE` | 星野穩定 | 見第 2 節 | M390 settled，高度 844→700 | **FAIL** |
| `P0-CONTRAST-BRASS` | 主按鈕對比 | 按鈕字 < 4.5:1（未達大字門檻：15.2px／700） | M390 計算色 `#161c24` on `#9a7b4f` = 4.34 | **FAIL** |
| `P0-OVERLAP-REST` | Hero 與 `#civ`、監測鐘、開蒙、版頭 | 靜止首屏相交 > 1px | M360、M390、D；暗色 M390 settled | **PASS**（間隙 0／20／4 px） |
| `P0-HSCROLL` | 頁面橫向滾動 | `scrollWidth > clientWidth + 1` | M360、M390、D | **PASS**（390=390，360=360；1280 的差額是捲軸槽） |
| `P0-CLIP-HERO` | Hero 字被 overflow 切開 | `clipped()` 對 kicker、標題、句子、按鈕為真 | 同上，含 playing | **PASS** |
| `P0-TOUCH-HERO` | Hero 可點盒 | 跳過、重播、兩顆 CTA、提示的寬高 < 44 | M390 | **PASS**（高皆 44；寬 81／129／177） |
| `P0-INK` | 禁止原型純黑換皮 | Hero 使用 `#05060a`，或整頁底被換成純黑 | CSS 與 M390 計算色 | **PASS**（底是 `#161c24` 徑向漸層，邊緣 `#121820`／`#1c2431`，不是 `#05060a`） |
| `P0-REDUCE-DEFAULT` | 預設減動態 | `reduce` 仍自動播放，或 canvas 持續重繪 | M390，未寫 seen flag | **PASS**（直接 settled；450ms 前後 `toDataURL` 相同） |
| `P0-DEPS` | 不為動畫加依賴 | 新增大 three／gsap／lenis，或 Hero 用 WebGL | `package.json` 與 Hero 原始碼 | **PASS** |
| `P0-TONE-LEAK` | 宅幽默滲出 Hero | 新聞、導讀、懶人包、`HOME_INTRO` 被改成開場口吻 | 本分支相對合併基線的 diff | **PASS**（diff 沒有這些檔） |
| `P0-LEARN-TREE` | 開蒙不被 8 卡取代 | `/learn/` 失去萬有地圖／樹，或 Hero 把開蒙收成封閉 8 科 | `shared/learnPage.ts` 與 diff | **PASS**（本 PR 沒有動開蒙；地圖與「開蒙 · 森羅」仍在） |

`P0-OVERLAP-REST` 通過，不代表 `C-SLICE-COVER` 通過。前者是首屏相貼，後者是跳轉落點。

### 3.2 P1（不計入上面的 Critical 數；未清則仍不該上線）

| ID | 項目 | FAIL 條件 | 覆蓋 | 結果 |
| --- | --- | --- | --- | --- |
| `P1-REPLAY-REDUCE` | 減動態下的重播 | `reduce` 時按「重播開場」離開 settled，重新跑 15.6 秒計時 | M390 reduce，已看過 | **FAIL**。900ms 時 `mode=playing`、`phase=singularity`、`transition: none`。句子會按節拍彈出，canvas 因掛載時的旗標停著。預設路徑是對的，這條是使用者按下之後。仍要改：reduce 下重播應留在 settled |
| `P1-RAF-SETTLED` | 結束後仍每幀重繪 | settled 且人在看 Hero 時 rAF 不停 | 程式＋播放中幀間隔 | **FAIL（輕）**。出視口與分頁隱藏有停。settled 之後星仍閃，迴圈不關。播放中 headless 幀間隔平均 16.7ms、p95 17ms，桌面不掉幀；低階手機未測 |
| `P1-MIN-FONT` | 非裝飾字 < 12px | kicker 實測字級 | M390、D | **FAIL**。`.hero-kicker` = **11px**（`--civ-type-kicker`）。aside 12.86px、提示 12.8px，過線 |
| `P1-LCP-SLIVER` | 有意義的 LCP | 首屏 LCP 落在裝飾圖而不是 Hero 標題 | M390 播放約 1.5s | **FAIL（結構）**。LCP 是 `.axis-vignette` 的 `civ-home-axis-bg-640w.webp`，面積 17160，約等於視口底緣那條約 44px 的軸帶。本地 104ms，因為圖在本機。慢速網路上這條縫會把 LCP 綁在裝飾圖上。字型不在關鍵路徑（站既有的 8 秒後才插入），這點是好的 |
| `P1-CHAPTER-TOKEN` | 三章色溫變成 token | 古暖金／今冷藍／未來紫黑沒有變數，或用它們換掉墨紙 | Hero CSS | **未做**。Hero 把銅金與一點 `#9ec0ef` 寫死在 canvas。沒有換皮。不阻擋「先修 Critical」，但 GM P0 第 3 步仍未落地 |

### 3.3 P2

| ID | 項目 | 說明 |
| --- | --- | --- |
| `P2-NO-DRIFT` | 規格寫粒子慢速漂移，程式只改透明度 | 不單獨判死。穩定之後可以再加很小的位移；禁止用重鋪星來假裝漂移 |
| `P2-SAFE-AREA` | Hero 全出血沒有 `env(safe-area-inset-*)` | 直向 390 沒有裁字。橫向瀏海未測 |
| `P2-H1-COUNT` | 首頁有兩個 `h1`：`.masthead-title` 與 `.axis-title` | Hero 用 `h2`，沒有加第三個。規格「單一 h1」與現況不符，但是既有結構 |
| `P2-LEARN-HIT` | 開蒙晶片實測 44×36，頁上另有一顆 32×31 | 既有 chrome，本 PR 未改。全站閘仍會看見，不記在 Hero Critical |
| `P2-EIGHT-CARDS` | GM 要的 8 科捷徑不在這支 PR | 正確。不要在修 Hero 時順便把開蒙收成 8 張卡 |
| `P2-SCIENCE` | 「最初的幾分鐘」把核合成與複合紀壓在一句 | 開場隱喻可以，不當新聞事實來寫。不必為這句擋閘 |

---

## 4. 必評項

### 獨白口吻

通過，而且應該留。七句是書面中文，幽默停在旁白：沒有聲音的「砰」、原子湯、藍色小石頭學會下雨。沒有粵語語尾，沒有口號，沒有末日秒錶。`tests/heroOpening.test.ts` 的語尾與紅線掃描與這個判斷一致。

新聞層沒有被改。`HOME_INTRO` 不在本分支 diff。幽默沒有滲進導讀或懶人包。

第 7 句「先看見尺度，再讀今天」把口吻交回本站的讀法，這句是對的。

### 逐句浮現、可跳過、無障礙

客戶端播放本身是清楚的。390 寬、約 1.2 秒：第 1 句 opacity ≈ 1，其餘為 0，相位 `singularity`。句子在正常流裡佔位，reveal 只動 opacity／transform，播放中沒有兩句的盒子相撞。跳過在 React 掛上之後有效：200ms 內 `settled`／`handoff`、七句全開、CTA 可見、`wn_hero_seen=1`。canvas 是 `aria-hidden`。標題是 `h2`，軸的 `h1` 還在。

未通過的是生產路徑的第一幀（C-SSR-BOOT），以及減動態下的重播（P1-REPLAY-REDUCE）。無 JS 時 4 秒後 boot 會自己 settled，這條保險可以留。

播放中 CTA 用 `visibility: hidden` 退出 Tab 序，這點對。跳過按鈕在 DOM 裡位於句子之後，視覺上在右上；播放中它是 Hero 裡唯一的焦點，可以接受。

### 星空／宇宙、LCP、主線程、reduced-motion

P0 是 2D canvas，不是 three.js。粒子有上限（面積公式，手機實測落在下限 90 附近，程式上限 210），DPR 封頂 2，沒有 `shadowBlur`。播放中的幀間隔在這台 headless 上是 16.7ms。這些都不能抵銷重鋪星。

reduced-motion 預設通過：不寫 seen 也直接 settled，canvas 靜止。CSS 的 reduce 區塊把 transition 關掉，但**沒有**把 playing 的 opacity:0 覆寫掉。預設路徑靠 JS 不去 playing，所以現在是安全的。boot 在 `matchMedia(reduce)` 時提早 return，SSR 維持 settled，這點也對。

LCP：Hero 沒有新的阻塞字型、沒有新圖。本地 LCP 卻被軸帶底緣那條既有 webp 拿走（P1-LCP-SLIVER）。修法是讓 `#civ` 的裝飾圖不要以 44px 的縫成為首屏最大元素（Hero 再高一點，或那張圖在進入視口前不要成為 LCP）。不要為了這個上 three.js。

### 與 chrome、軸、監測鐘、`#slice`

| 關係 | 判定 |
| --- | --- |
| 版頭／開蒙 vs Hero | 相貼，不相交。開蒙仍是 `/learn/` |
| Hero vs `#civ` | 間隙 0，銅金線交到軸。這是銜接，不是壓住 |
| `#civ` vs 監測鐘 | 間隙 20px。鐘的模組本 PR 沒有改，沒有秒錶化 |
| Hero 主按鈕 vs `#slice` | **FAIL**，見 C-SLICE-COVER |
| 搜尋 `?q=test` | Hero 不渲染。總覽 `/civilization/` 沒有 Hero |
| 監測鐘文案 | 未改 |

### 墨紙 vs 原型純黑；三章 token

基底是墨 `#161c24`，紙色字 `#f7f1e6`／`#e8e4dc`，銅金 `#c4a572`／`#9a7b4f`。淺色主題下 Hero 仍是墨帶，下面的切片仍是紙，沒有整站換皮。邊緣的 `#121820` 是暗角，不是第二套純黑。

三章 token 沒有做成變數。古金、今藍只出現在星與地球點的字面量裡，未來紫黑沒有出現。可以後做，不可以拿來換底。

### 8 科卡 vs 萬有地圖

本 PR 沒有 8 科卡，也沒有把開蒙收窄。`/learn/` 仍是「開蒙 · 森羅」與萬有地圖。Hero 的出口是 `#slice` 與 `/civilization/`，沒有一條去開蒙。那是加厚時的事，不是現在的缺陷。加的時候只能做捷徑，鏈到現有樹節點。

### 手機 safe、裁字、overflow

360 與 390：Hero 句子、標題、按鈕的 `clipped()` 為假。360 上內容把區塊撐過 `84svh`（高 703，min-height 672），沒有被 `overflow: hidden` 吃掉。390 上高 709，等於 `84svh`，句子仍完整。跳過與 kicker 的盒子不相交。

頁面級沒有橫向捲軸。Hero 的 `margin: 0 -16px` 與軸帶同一種出血，這次沒有把 body 撐出視窗。

開蒙晶片高度 36px 是既有版頭，不是這支 Hero 新挖的洞。

---

## 5. 開工建議

方向留下。下一次只修閘，不上 three.js，不部署，不動新聞與廣告。

### P0 最小可合併範圍

| 檔 | 改什麼 |
| --- | --- |
| `shared/heroOpening.ts` | boot：進入 `playing` 時把 `.hero-line` 的 `data-on` 設為 `false`；`[data-hero-skip]` 在 React 之前就能 settled 並寫 `wn_hero_seen` |
| `src/components/HeroOpening.tsx` | 星的種子固定；寬度不變不重鋪。`replay()` 在 `prefersReducedMotion()` 時留在 settled |
| `src/App.css` | `#slice`／`.today-slice` 的 `scroll-margin-top` 至少為版頭高度＋16px。`.hero-btn-brass` 改到對比 ≥4.5（底改 `#c4a572` 則與 `#161c24` 約 7.3:1，或字改 `#f7f1e6`）。kicker 字級 ≥12px。可選：settled 後不要再跑星的 rAF |
| `tests/heroOpening.test.ts` | 鎖住三件事：boot 字串含把 `data-on` 清掉；`#slice` 規則含 `scroll-margin-top`；按鈕色對不是現在這組 4.34 |

不要在這包裡做：`/learn/` 8 卡、水平 scroll-snap、three.js、Functions 重新部署。

### P1 延後

- 三章 CSS 變數（古暖金／今冷藍／未來紫黑），只做章節 token，墨紙不動。
- 8 科捷徑卡，另 PR，鏈現有樹，不取代萬有地圖。
- 軸帶暗角圖不要搶 LCP（首屏底緣那 44px）。
- settled 後 canvas 停在一幀。規格裡的「漂移」若要補，用同一批星的小位移，禁止 resize 重骰。
- 四大合議之前，粒子大爆炸維持不做。

---

## 6. 過關票

**Grok 4.7 席：現況 FAIL。** 我改投 PASS 的條件只有一句：首訪第一幀就是逐句隱藏且跳過立刻有效，390 寬「進入今日切片」的標題整段露在版頭之下，星野不因網址列重抽，銅金主按鈕對比至少 4.5:1。

這張票不是上線許可。站級閘仍要三席 Critical＝0 與 GM 簽字；Functions 日配額恢復之前，這包不上 live。

---

## 7. 實測紀錄（2026-10-22）

環境：本分支 Vite，headless Chrome，裝置尺度 1。SSR 片段由 `renderHeroOpening()` 加上 `src/App.css`。`tests/heroOpening.test.ts` 7 例通過；那 7 例沒有覆蓋 boot 的 `data-on`、`#slice` 的 scroll-margin、或星的重鋪。

| 場景 | mode | Hero→`#civ` | `#civ`→鐘 | 版頭→Hero | 相交 | 裁字 | scrollWidth |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 390 淺色 settled | settled | 0 | 20 | 4 | 無 | 無 | 390=390 |
| 390 淺色 playing ~1.2s | playing／singularity，僅第 1 句 | 0 | 20 | 4 | 無 | 無 | 390=390 |
| 360 淺色 settled | settled | 0 | 20 | 4 | 無 | 無 | 360=360 |
| 390 暗色 settled | settled | 0 | 20 | 4 | 無 | 無 | 390=390 |
| 390 reduce，無 seen | settled，canvas 靜止 | 0 | 20 | 4 | 無 | 無 | 390=390 |
| 1280 淺色 settled | settled | 0 | 20 | 16 | 無 | 無 | 無頁面橫滾 |
| 客戶端按跳過 | 200ms 內 settled，7 句，CTA 可見 | — | — | — | — | — | — |
| 客戶端按進入今日切片 | hash `#slice`，h2 被版頭蓋住 72px | — | — | — | **有** | 標題不可讀 | — |
| SSR boot 後立即 | playing，七句 opacity 1，CTA hidden，跳過無效 | — | — | — | — | — | — |

署名：**Grok 4.7 席**。2026-10-22。
