# 文明編年史 · 開場 Hero 席審 — GLM 5.3（2026-10-22）

- 席次：**GLM 5.3**（post-pick 站級閘三席之一；本文件是席審，不是 GM 上線簽字）
- 對象：PR [#186](https://github.com/jainaspp/world-news/pull/186)／分支 `cursor/bbt-hero-opening-eb86`（GM 於 PP O「是旦」之後揀定的 Kimi K3 實作）
- 對照：`BRIEF-GM-ADOPT-2026-10-21`、`PICK-COMPARE-2026-10-21`、`docs/hero/BBT-HERO-KIMI-K3-SPEC-2026-10-21.md`、`docs/gates/SITE-MAJOR-UPDATE-GATE.md`
- 性質：只讀。本席不改 Hero／App 生產碼、不部署、不合併 #186。
- 實測：headless Chrome。SSR 用 `renderHomeFeed([])` 加本分支 `src/App.css`；SPA 用該分支 Vite `http://127.0.0.1:5173/`，清 `wn_hero_seen`。視口 320×700、360×800、390×844、1280×800。`prefers-reduced-motion` 取 no-preference 與 reduce。相交超過 1px 算重疊；`documentElement.scrollWidth > clientWidth + 1` 算橫向溢流。
- 單測：`tests/heroOpening.test.ts` 7 例通過。這 7 例鎖文案與原始碼字串，不鎖計算樣式。

---

## 1. 總評

**PASS_WITH_FIXES**

必改（三條 P0 未落地之前，本席不把 #186 當過關，亦不同意合併）：

1. **P0-HANDOFF-01** — 可點的下一步要落到 `#civ`（古→今→未來這條脊柱）。現在銅金主按鈕與「開始編年」都指向 `#slice`。
2. **P0-TOKEN-01** — 補上古暖金／今冷藍／未來紫黑三個章節 token，畫布改讀 token。基底保持墨紙 `#161c24`。禁止順手改 `#civ`、監測鐘、`/learn/`、新聞層的皮，禁止 `#05060a`。
3. **P0-REVEAL-01** — SSR 在 `data-mode="playing"` 時七句仍然全開。boot 要在首繪前把每句 `data-on` 收成隱藏，React 再逐句打開。

Critical = 0。手機 ≤390 的頁級溢流，以及 Hero 與 `#civ`／監測鐘／開蒙的相交，實測都沒有破。因此總評不是 FAIL。Critical 為 0 只滿足乾淨 PASS 的必要條件；上面三條 P0 仍在，所以不是 PASS。

---

## 2. Critical 清單

（空）

手機閘實測，供 GM 對帳：

| 表面 | 視口 | `scrollWidth` / `clientWidth` | Hero ∩ `#civ` | Hero ∩ `#monitor` | `#civ` ∩ 監測鐘 | ∩ 開蒙 |
|---|---|---|---|---|---|---|
| SSR 首頁 | 320 | 320 / 320 | 無 | 無 | 無（距 20px） | 無 |
| SSR 首頁 | 360 | 360 / 360 | 無 | 無 | 無（距 20px） | 無 |
| SSR 首頁 | 390 | 390 / 390 | 無 | 無 | 無（距 20px） | 無 |
| SSR 首頁 | 1280 | 1265 / 1265 | 無 | 無 | 無（距 20px） | 無 |
| SPA 首頁 playing | 360、390、1280 | 等於 clientWidth | 無 | 無 | 無（距 20px） | 無 |
| SPA 390 reduced／17s settled | 390 | 390 / 390 | 無 | 無 | 無（距 20px） | 無 |
| `/learn/` 開蒙殼 | 360、390 | 等於 clientWidth | 無 Hero（`heroCount = 0`） | — | — | 標題「開蒙 · 森羅」完整 |

390 SPA：Hero 下緣與 `#civ` 上緣相接（0px 縫，未相交）。390 SSR：中間剩 12px，原因見 P1-BOOT-01，仍未相交。監測鐘在 `#civ` 之下 20px（`--civ-stack`）。開蒙 chip 在 Hero 之上：390 SPA 的 chip 底在 y=80，Hero 頂在 y=91。

`.page` 內部 `scrollWidth` 比自己的 `clientWidth` 大 16px，來自既有的 `-16px` 出血（Hero 沿用 `.axis-hero` 同一模式）。頁級 `documentElement` 沒有被撐出橫向捲軸。`.deep-axis`（約 548px）與 `.chronicle-track` 是容器內橫滑，`overscroll-behavior-x` 已隔離，沒有把 body 帶走。

---

## 3. 檢測 list

覆蓋代號：M≤390＝320／360／390；D＝1280。頁面：HP 首頁 Hero、AX 軸銜接 `#civ`、CLK 監測鐘、LRN 開蒙、LCP 首屏文字。

### P0

| ID | 項目 | FAIL 條件 | 覆蓋 | 本席結果 |
|---|---|---|---|---|
| P0-HANDOFF-01 | 軸銜接必須把讀者交到 `#civ` 的古→今→未來脊柱 | 主行動或「開始編年」指向 `#slice`／新聞；Hero 內沒有任何控制項的 `href` 是 `#civ`；結尾句把「先看見尺度」說完，按鈕卻先送去今日切片 | M≤390 × HP／AX；D × HP／AX | **未過** |
| P0-TOKEN-01 | 三章 token 可接上，且不換整站皮 | 古／今／未來色只寫死在 canvas `rgba` 或 Hero 漸層，之後要改章節色就得改畫法；或為了接 token 去改 `#161c24` 軸底、鐘、開蒙、新聞卡；或出現 `#05060a` | M≤390 × HP；D × HP；LRN 皮不得動 | **未過** |
| P0-REVEAL-01 | 逐句浮現在 SSR 首繪就成立 | `data-mode="playing"` 時任一未到點的 `.hero-line` 計算樣式 `opacity` 為 1；boot 只改 `data-mode`／`data-phase`、不改 `data-on` | M≤390 × HP；D × HP；LCP | **未過** |
| P0-OVERFLOW-01 | 頁級橫向溢流 | `documentElement.scrollWidth > clientWidth + 1`，或 Hero 出血把 body 拖出橫捲 | M≤390 × HP／LRN；D × HP | 過 |
| P0-OVERLAP-01 | Hero 不得壓住 `#civ`、監測鐘、開蒙 | 任兩盒相交超過 1px；開蒙 chip 或「開蒙 · 森羅」被裁 | M≤390 × HP／AX／CLK／LRN；D × HP | 過 |
| P0-CLIP-01 | Hero 正文不被裁 | `.hero-opening` 把句子、kicker、標題裁掉；`overflow: hidden` 切到字 | M≤390 × HP；D × HP | 過（標題盒見 P2-TITLE-01，字未切） |
| P0-INK-01 | 基底是墨紙，不是原型純黑 | Hero 底使用 `#05060a`，或整段改成另一套頁底 | M≤390 × HP；D × HP | 過（中段 `#161c24`；邊緣色見 P0-TOKEN-01） |
| P0-MOTION-01 | reduced-motion 直接給完整靜態版 | `prefers-reduced-motion: reduce` 仍自動播放或隱藏句子 | M≤390 × HP | 過（SSR 與 SPA 390 皆 `settled`／`handoff`，七句可見，無 transition） |
| P0-TOUCH-01 | Hero 自身控制項 ≥44px | 跳過、重播、兩顆 CTA、提示的盒小於 44×44 | M≤390 × HP | 過（實測高 44；兩顆 CTA 邊緣距 10px） |
| P0-TONE-01 | 宅幽默只留在 Hero | 新聞、導讀、懶人包、`homeIntro` 被本 PR 改寫 | 全頁 | 過（#186 diff 沒有那些檔） |
| P0-LEARN-01 | 8 科卡不得縮成開蒙本體 | 本 PR 用 8 張卡取代萬有地圖或刪樹 | LRN | 過（未改 `/learn/`；殼上仍是「萬有地圖」） |
| P0-CLOCK-01 | 監測鐘維持靜態編輯刻度 | Hero 讓鐘變成秒錶，或與鐘重疊 | M≤390 × CLK | 過（`shared/civilization/clock.ts` 不在 diff；距 20px） |
| P0-DEPS-01 | P0 動畫不得拖進 three／gsap／lenis | `package.json` 新增這三個依賴，或 Hero 改走 WebGL | HP／LCP | 過（2D canvas，零新依賴） |

### P1

| ID | 項目 | FAIL 條件 | 覆蓋 | 本席結果 |
|---|---|---|---|---|
| P1-BOOT-01 | SSR 零縫銜接 | boot `<script>` 夾在 `.hero-opening` 與 `.axis-hero` 之間，相鄰選擇器失效，SSR 留下軸的 `margin-top: 12px` | M≤390 × AX | **未過**（390 SSR 縫 12px；SPA 因 `.axis-mount` 包一層而為 0） |
| P1-RAF-01 | 跳過／settle 後畫布停 | settled 或按「跳過開場」之後 rAF 仍無限 twinkle；畫面上沒有真正停畫的手段 | M≤390 × HP；D × HP | **未過**（迴圈只在離屏、隱藏分頁、reduced-motion 時停） |
| P1-PERF-01 | 首屏主線程有上限 | 粒子數或每幀 radialGradient 在 ≤390 仍滿載跑完整個 Hero 在視內的時間，並與 hydration 搶主線程 | M≤390 × LCP | 有上限（≤210、DPR≤2、離屏即停），仍建議首屏再降一檔。不單獨擋合併 |
| P1-THREE-01 | three.js 維持 P1 | P0 這包把粒子大爆炸做成 WebGL | HP | 過（未做，應繼續延後） |
| P1-A11Y-01 | 自動運動超過 5 秒可停 | 只有「跳過」結束句子，畫布運動不停；沒有鍵盤以外的第二個停止點可以接受，但畫布必須隨跳過停止 | HP | 併入 P1-RAF-01 |
| P1-CARDS-01 | 8 科捷徑以後再做 | 捷徑卡做成封閉 8 科、不鏈回現有樹節點 | LRN | 延後。現目錄是 12 科種子加課葉，不是 8 卡完事 |

### P2

| ID | 項目 | FAIL 條件 | 覆蓋 | 本席結果 |
|---|---|---|---|---|
| P2-CTA-01 | Hero CTA 與軸帶 CTA 各說各話 | 兩排都是「總覽 + 今日切片」，Hero 沒有「看軸」 | HP／AX | 記錄。修好 P0-HANDOFF-01 後這條自然消掉 |
| P2-TEST-01 | 測試鎖定實測行為 | 測試只 `toContain` 原始碼，SSR playing 全亮也能綠 | HP | 記錄。7 例今日全綠，抓不到 P0-REVEAL-01 |
| P2-SPEC-01 | 規格與 DOM 一致 | 規格寫「boot 在首繪前藏句」「單一 h1」 | HP | 記錄。藏句不成立。SPA 有 masthead `h1` 加軸 `h1`（既有）；Hero 自己用 `h2`，這點正確 |
| P2-CLEAR-01 | 跳過鈕與 kicker 留白 | 兩盒相交 | M≤390 × HP | 未相交。320 SSR 垂直距 2px，390 SPA 距 5.2px。合併前不必改，改 padding 時不要改成相交 |
| P2-TITLE-01 | 標題盒與字高 | 字被切掉 | M≤390 × HP | 390 settled 約 17s 後 `.hero-title` `scrollHeight` 40、`clientHeight` 36。Hero 自身 `scrollHeight === clientHeight`，4px 落在標題下 margin 裡，肉眼句子未切 |
| P2-CHIP-01 | 開蒙 chip 觸控高度 | 本 PR 把 chip 改小或裁字 | M≤390 × LRN | 非本 PR。SPA ≤720 的開蒙 chip 實測 44×36（既有 `.chrome .chip-scroller`）。字在盒內，與 Hero 不相交。不計入本席 Critical |

---

## 4. 必評項

### 4.1 獨白口吻

七句是書面語，宅幽默收在 aside（「其實沒有聲音」「你體內每個原子」），主句仍是尺度敘事。用字「甚麼」，沒有粵語粒子。#186 的 diff 只有 Hero 模組、首頁掛載、Hero CSS 與 Hero 測試，沒有改導讀、懶人包、`homeIntro`、新聞 pipeline、AdSense。幽默沒有滲出 Hero。這條過。

### 4.2 逐句浮現、可跳過、無障礙

React 接管之後是對的。390 SPA 在清掉 session 後約 1.6 秒：`data-mode="playing"`、`data-phase="singularity"`，第 1 句 opacity ≈ 1，第 2–7 句 opacity 0。CTA 在 playing 時 `visibility: hidden`，不進 tab 序。跳過／重播是真按鈕，44px。reduced-motion 直接 settled。句子 opacity 0 時仍在無障礙樹，讀屏一次讀完，這是可接受的。

SSR 首繪是錯的。`renderHeroOpening()` 給每一句 `data-on="true"`（實測 7 個 true、0 個 false）。CSS 裡「playing 時隱藏」的規則被「`data-on="true"` 時顯示」蓋過。boot 只把模式改成 `playing`／`singularity`，不改 `data-on`。390／360／320／1280 的 SSR 實測都是：模式已是 playing，七句 opacity 全是 1。生產路徑是 Functions 把這段 HTML 灌進 `#root`，然後 `createRoot().render()` 整樹換掉。讀者會先看見全文，React 再把句子藏起重播。規格第 3 節說 boot 能杜絕這一下，與計算樣式不符。4 秒後備只在 React 沒寫 `data-hero-boot` 時把模式打回 settled；句子本來就全亮，這條後備沒有把「空 Hero」救回來，因為空 Hero 並不存在。

跳過會 `sessionStorage` 記下已看，這點符合「每節一次」。重播不應清掉這個旗標，目前也沒清，合理。

### 4.3 星空／宇宙動畫、LCP、主線程、reduced-motion

P0 用一個 2D canvas rAF，粒子上限 210，DPR 上限 2，柔光用 radialGradient，沒有 three.js／gsap／lenis，沒有新依賴。這符合 GM「P0 輕量 canvas、P1 才是 three.js」。

LCP 候選是 Hero 的文字（`h2` 與第一句），不是圖、不是 canvas。字型沿用站上 8 秒後才插入的非阻塞載入。這包沒有把一張宇宙大圖放進首屏。

主線程：Hero 在視內就會每幀畫。離屏與隱藏分頁會停。≤390 建議再降粒子，列 P1，不單獨否決。

reduced-motion：boot 提前 return，React 初始 state 走 settled，canvas 只畫一幀，CSS `animation/transition: none`。390 實測 SSR 與 SPA 都是 settled／handoff。這條過。

P1 粒子大爆炸、水平 scroll-snap、學科 modal 都還沒做，應維持延後。

### 4.4 與 chrome、軸、監測鐘、`#slice` 是否衝突

幾何上不衝突，見第 2 節。順序是 chrome／開蒙 chip → Hero → `#civ` → 監測鐘 → 編年帶 → `#slice`。鐘的文案仍是「並不逐秒走動」。Hero 沒有廣告槽。

操作銜接是斷的，這是 P0-HANDOFF-01：

- 銅金主按鈕「進入今日切片」→ `#slice`
- 幽靈鈕「打開文明總覽」→ `/civilization/`
- 提示「向下滾動，開始編年」→ `#slice`
- Hero 內沒有 `href="#civ"`

最後一句 aside 寫「先看見尺度，再讀今天」。尺度就是下方 `#civ`（宇宙、地球、起源、技術、城市、今天、未來）。主按鈕把順序倒過來，先送進今日新聞切片。站上「編年」是 `/civilization/chronicle/`，不是 `#slice`。提示的字與落地點不一致。

390 的 `.deep-axis` 是 548px 內容塞在約 358px 的橫滑裡（既有、已隔離）。第一眼看得到脊柱前段；「今天」「未來」要在軸內橫移才完整進入視區。Hero 若把人送去 `#slice`，這次橫移不會發生。空間上 Hero 已經貼着 `#civ`（SPA 0px 縫），修法是改連結與文案，不是再加一層定位。

≤640 的 `.deep-axis .rail { display: none }` 是既有規則。規格說底邊銅金線接上 `.rail`。手機上那條 rail 不顯示，改由 `.milestones::before` 畫軌。交接線仍然可以貼着 `#civ` 的頂，只是不要在規格裡寫成「接上 .rail」就算手機已交接。

### 4.5 墨紙 token，以及古→今→未來能否不換皮

Hero 沒有 `#05060a`。中段色是 `#161c24`，字色 `#e8e4dc`／`#f7f1e6`／`#c4a572`／`#a8b0ba` 對 `#161c24` 的對比約 13.5／15.2／7.3／7.8，都高於 4.5。銅金鈕字 `#161c24` 對 `#9a7b4f` 約 4.34，字重 700、字級約 15px，按大字門檻（粗體 ≥14px）過 AA。這組鈕色與既有 `.axis-hero .btn-brass` 相同。

未過的是章節 token，不是「已經換成純黑」：

- `:root` 沒有古／今／未來三個 custom property。Hero 色是 CSS 與 `HeroOpening.tsx` 裡的字面量。
- 漸層兩端是 `#1c2431` 與 `#121820`。`#121820` 比鎖死的軸墨 `#161c24` 更深，Hero 底緣與 `#civ` 的 `#161c24` 有一條色階。這還不是原型純黑，但交接面已經不是同一塊墨。
- 地球點 `rgba(158,192,239)` 等於暗色 `--color-primary`（`#9ec0ef`），卻寫死在畫布。它現在是「一顆星球」，不是「今」的章節 token。日後改暗色主色會連星球一起改，或改章節時改不到星球。
- 未來紫黑完全沒有。交接線只有銅金。軸軌也是銅金到紙白。三章色溫接不進 `#civ`，除非再改畫法——那一步就是在改皮。

要的修法：在 `.hero-opening`（或一組不重繪新聞／鐘／開蒙／軸底的 civ token）定義三個變數，例如古暖金沿用已有 `#c4a572`、今冷藍、未來紫只供給 Hero 的交接線與星球。canvas 用 `getComputedStyle` 讀它們。Hero 底的主色停在 `#161c24`，與 `#civ` 相接。不要在同一改動裡改 `.axis-hero` 背景、`.bulletin-clock`、`.learn-page`、新聞卡。未來紫先停在 Hero 交接線；軸要不要採用，另一次、仍禁止換皮。

### 4.6 8 科啟蒙卡與 `/learn/` 萬有地圖

這包沒有做 8 科卡，也沒有改 `shared/learnPage.ts`。開蒙殼的 h1 仍是「開蒙 · 森羅」，地圖標題仍是「萬有地圖」，目錄仍是多科種子而不是 8 張封閉卡。360／390 的開蒙頁沒有 Hero，頁級沒有橫向溢流，標題沒有裁切。

GM 工作順序裡的 8 科捷徑留在別的 PR。那一包的約束：每張卡鏈到現有樹節點，地圖與樹留着。本席不要求 #186 順手做卡。

### 4.7 手機 safe、裁字、overflow

≤390（含加測 320）頁級沒有橫向溢流，Hero 與 `#civ`、監測鐘、開蒙不相交，Hero 句子沒有被 `overflow: hidden` 裁掉。Hero 控制項 44px。kicker「文明編年史 · 開場」五字在盒內。320 寬時跳過鈕與 kicker 垂直距 2px，未相交。

既有、不計入本 Hero Critical：SPA 窄屏開蒙 chip 高 36px；軸鈕仍是 `min-height: 36px`；軸節點仍是 12px 字。它們不在 #186 的改動裡，也沒有被 Hero 壓住。

---

## 5. 開工建議

### P0 最小可合併範圍（檔案級）

只動這四個檔，清掉三條 P0 與 P1-BOOT-01、P1-RAF-01：

| 檔 | 改什麼 |
|---|---|
| `shared/heroOpening.ts` | boot 在設 `playing` 的同一刻，把每條 `.hero-line` 的 `data-on` 設為隱藏。`<script>` 不要再當 `.hero-opening` 與 `.axis-hero` 的兄弟（挪到 section 內或 `</body>` 前的既有 boot 位）。銅金鈕改為進入 `#civ`（文案對應「先看時間軸／尺度」）。「開始編年」若保留這四字，落地必須是編年；若落地仍是向下，文案改成進入時間軸，`href="#civ"`。`#slice` 降為次按鈕。 |
| `src/components/HeroOpening.tsx` | 與 SSR 同一組 `href` 與文案。`PHASE_TARGETS` 的顏色改讀 Hero 上的三章 token。`finish()`（跳過與 settle）之後停 rAF，留一幀靜態完成態。 |
| `src/App.css` | `.hero-opening` 增加三個章節 custom property；背景主停靠 `#161c24`，底緣與 `#civ` 同一墨，不要 `#121820` 這條更深的交接。零縫選擇器改成不依賴「section 緊貼 section」（以蓋過 boot 腳本曾經造成的 12px）。不要改 `.axis-hero`、`.bulletin-clock`、`.learn-*`、新聞卡的顏色。 |
| `tests/heroOpening.test.ts` | 斷言：playing 的 boot 會清 `data-on`；Hero 標記含 `href="#civ"`；「開始編年」與 `#slice` 不得同時出現在同一條 `<a>`；CSS 含三個章節變數且 Hero 段沒有 `#05060a`。 |

不要做：改 `/learn/` 成 8 卡、改監測鐘、改 AdSense、改新聞文案、加 three／gsap／lenis、為這包 redeploy Functions。

### P1 延後

- three.js／粒子大爆炸／ambient，維持 click-to-play，另過動畫合議。
- 水平 scroll-snap 互動軸。
- 學科 modal（人物小傳，CC BY 4.0）。
- `/learn/` 8 科捷徑卡：鏈現有樹，不取代萬有地圖。
- ≤390 再降粒子數，可跟 token 那次一起做，不另開範圍。

---

## 6. 過關票

本席（GLM 5.3）在這三件事同時為真時投 PASS：手機 ≤390 仍保持今次這種頁級零溢流、且 Hero 不與 `#civ`／監測鐘／開蒙相交；銅金主行動進入 `#civ` 的脊柱而不是 `#slice`；古→今→未來三個 token 只供 Hero 讀取、墨紙 `#161c24` 與開蒙／鐘／新聞皮不動，並且 SSR `playing` 時未到點的句子真的隱藏。在此之前維持 **PASS_WITH_FIXES**，Critical = 0，不同意合併 #186，不同意部署。

— GLM 5.3 席，2026-10-22
