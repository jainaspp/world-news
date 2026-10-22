# 文明編年史 · 開場 Hero 再閘 — GLM 5.3（2026-10-22 R2）

- 席次：**GLM 5.3**（post-pick 站級閘再閘；本文件是席審，不是 GM 上線簽字）
- 對象：PR [#186](https://github.com/jainaspp/world-news/pull/186)／分支 `cursor/bbt-hero-opening-eb86`／修復提交 `8859f381657cbcb2035e7c5e8315fcd88e019962`
- 上一票：本席 2026-10-22 **PASS_WITH_FIXES**（`docs/gates/BBT-HERO-REVIEW-GLM-5.3-2026-10-22.md`，PR #189）。必改三條：P0-HANDOFF-01、P0-TOKEN-01、P0-REVEAL-01
- 同輪要覆核的他席 Critical：Kimi K3 的 `K3-P0-SLICE`、`K3-P0-CIV-EDGE`、`K3-P0-BRASS`、`K3-P0-SSR`；Grok 4.7 的 `C-SSR-BOOT`、`C-SLICE-COVER`、`C-STAR-RESHUFFLE`、`P0-CONTRAST-BRASS`
- 對照：`BRIEF-GM-ADOPT-2026-10-21`、`docs/hero/BBT-HERO-KIMI-K3-SPEC-2026-10-21.md`、`docs/gates/SITE-MAJOR-UPDATE-GATE.md`
- 性質：只讀。本席不改 Hero／App 生產碼、不部署、不合併 #186。本文件不改正典閘條文。
- 實測：headless Chrome。SPA 為本分支 Vite `http://127.0.0.1:5173/`，每次清 `wn_hero_seen`。SSR 為 `injectHomeShell(index.html, [])`，樣式走 `/site.css`（即 `src/App.css`），拿掉 module script，避免 `createRoot` 把樹換掉。視口 320×700、360×800、390×844、414×896、1280×800；390 另測暗色。`prefers-reduced-motion` 取 reduce（幾何）與 no-preference（首繪／跳過）。相交超過 1px 算重疊。系統有文泉驛黑體，站上 Noto 仍是載入 8 秒後才插入。
- 單測：`npx vitest run` **383** 通過，其中 `tests/heroOpening.test.ts` **16**。修復提交相對 `a34da72` 只動六個檔：`shared/heroOpening.ts`、`shared/heroStars.ts`、`shared/spineTrack.ts`、`src/App.css`、`src/components/HeroOpening.tsx`、`tests/heroOpening.test.ts`。

---

## 1. 總評

**PASS**

Critical = 0。上一票的三條必改，加上 Kimi／Grok 的 Critical，這次都量過。

| 上一輪必改／他席 Critical | 本輪 |
|---|---|
| P0-HANDOFF-01 主行動進 `#civ` | 過。銅金「開始編年」與提示都是 `#civ`；「進入今日切片」是次按鈕，指向 `#slice` |
| P0-TOKEN-01 三章 token 只在 Hero，墨 `#161c24` 不動 | 過。`--era-ancient`／`--era-now`／`--era-future` 只在 `.hero-opening`。`:root`、`#civ`、監測鐘、`#slice` 讀到的是空字串。`#civ` 底是 `rgb(22, 28, 36)` |
| P0-REVEAL-01／K3-P0-SSR／C-SSR-BOOT 首繪逐句隱藏 | 過。SSR `playing` 時七句 `data-on=false`、opacity 0。boot 先改 `data-on`，再改 `data-mode` |
| K3-P0-SLICE／C-SLICE-COVER `#slice` 標題讓出版頭 | 過。390 淺色與暗色，h2「今日切片」在版頭下緣之下 **31.14px** |
| K3-P0-CIV-EDGE 手機脊柱切半個節點字 | 過。360／390／414／320 靜止是完整四格（宇宙／地球／起源／技術），「城市」整格在軌外。拉到盡頭是完整的技術／城市／今天／未來 |
| K3-P0-BRASS／P0-CONTRAST-BRASS | 過。實算 `#161c24` 在 `#a18256` 上，對比 **4.77:1**（15.2px／700） |
| C-STAR-RESHUFFLE 高度一變就重抽星野 | 過。畫布高 709→704，橫向亮度相關 **0.99989**。高度只變時沿用同一組種子座標 |

這張票是本席對 #186 修復後的過閘票。它不是合併許可，也不是部署許可。站級閘仍要三席 Critical＝0，上線仍要 GM 簽字。Functions 配額期間這包不上 live。

---

## 2. Critical 清單

（空）

### 2.1 七項覆核

**交接。** `HERO_PRIMARY` 與 `HERO_HINT` 的 `href` 是 `#civ`，文案是「開始編年」「向下滾動，開始編年」。`HERO_SECONDARY` 是「進入今日切片」→ `#slice`。SSR 標記與 React 元件用同一組常數。390 點銅金鈕之後，`#civ` 上緣在版頭下 **15.95px**，軸題「站在一條很長的時間軸上」在版頭下 **50.95px**。360 是 15.55／50.55。1280 版頭高 105，`scroll-margin-top` 是 121px，軸題淨空 **59.16px**。

**章節 token 與墨。** `.hero-opening` 上是 `--era-ancient: #c4a572`、`--era-now: #9ec0ef`、`--era-future: #2a2140`。畫布用 `getComputedStyle` 讀這三個，再畫古金星、今藍地球、未來紫黑交接輝光。`:root` 沒有這三個變數。監測鐘底仍是紙 `rgb(247, 241, 230)`，切片底仍是 `rgb(243, 245, 248)`。Hero 與標記裡沒有 `#05060a`。`#civ`、鐘、開蒙、新聞卡的皮不在這次 diff。Hero 漸層仍是 `#1c2431 → #161c24 55% → #121820`，中段墨沒有改；底緣 `#121820` 與軸墨差一階，記在 P2-EDGE-01，不升 Critical。

**SSR 首繪。** 390／360／1280 的無 React 頁：`data-mode=playing`、`data-phase=singularity`，七句 `data-on=false`、opacity **0**。跳過鈕在 boot 裡就有 listener。點下去之後 `wn_hero_seen=1`、模式 `settled`。SPA 在 no-preference 下點「跳過開場」，1.1 秒後七句 opacity 都是 1（中間那一幀仍在 880ms 過渡上）。`createRoot` 仍會換掉 SSR 節點，這是殘留 P1；換掉之前句子已經收起，全文閃現那一條不再成立。

**切片淨空。** 首頁 `#slice` 與 `#civ` 的 `scroll-margin-top` 是 `--home-anchor-offset`：寬 ≤700 為 **103px**，其外 **121px**。文明頁的 `--civ-anchor-offset: 220px` 還在，沒有被這條蓋掉。點「進入今日切片」之後：

| 視口 | 版頭下緣 | h2 頂 | 淨空 |
|---|---|---|---|
| 320×700 | 87 | 145.33 | 58.33 |
| 360×800 | 87 | 117.73 | 30.73 |
| 390×844 淺色 | 87 | 118.14 | 31.14 |
| 390×844 暗色 | 87 | 118.14 | 31.14 |
| 414×896 | 87 | 117.81 | 30.81 |
| 1280×800 | 105 | 135.94 | 30.94 |

門檻是版頭之下至少 8px。上表都過。

**脊柱。** ≤640 的 `.milestones li` 寬是 `calc((100cqi - 36px) / 4)`，軌是 `scroll-snap-type: x mandatory`。390 靜止軌寬 358，四格各 80.5px，可見宇宙／地球／起源／技術；「城市」「今天」「未來」整格在軌外，沒有半格。拉到盡頭（scrollLeft 278）可見技術／城市／今天／未來，同樣沒有半格。360（格寬 73）、414（86.5）、320（63）同一規律。1280 不進這條 media，七格都在軌內，`scrollWidth === clientWidth`（968）。`.lab`／`.yr` 的 `scrollWidth === clientWidth`，「~138億」「~300ka」沒有溢出格子。`/civilization/` 在 390 用同一條軌，靜止與盡頭同樣是完整四格，頁級 390／390。

**銅金。** `.hero-btn-brass` 與 `.axis-hero .btn-brass` 的填色是 `--brass-ink-fill: #a18256`，字色 `#161c24`。390 實算對比 **4.767:1**。字級 15.2px、字重 700，用正文門檻 4.5。飾線、軸軌、其他 `#9a7b4f` 標記這次沒有改。

**星野。** `syncHeroStarField` 在寬度不變時保留同一組星，只把 `v` 乘上新高度。`HeroOpening.tsx` 沒有 `Math.random`。減動態下把視口高度從 844 收到 838，畫布緩衝 709→704，橫向亮度向量相關 0.99989。這是縮放，不是重鋪。

### 2.2 手機幾何（減動態、已看過的 settled）

| 表面 | 視口 | `scrollWidth` / `clientWidth` | Hero ∩ `#civ` | Hero ∩ 鐘 | `#civ` ∩ 鐘 | ∩「開蒙」 |
|---|---|---|---|---|---|---|
| SPA | 360 | 360 / 360 | 無（縫 0） | 無 | 無（距 20px） | 無（距 11px） |
| SPA | 390 淺色／暗色 | 390 / 390 | 無（縫 0） | 無 | 無（距 20px） | 無（距 11px） |
| SPA | 414 | 414 / 414 | 無（縫 0） | 無 | 無（距 20px） | 無 |
| SPA | 1280 | 1280 / 1280 | 無（縫 0） | 無 | 無（距 20px） | 無（距 21px） |
| SSR | 360、390、1280 | 等於 clientWidth | 無（縫 **12px**） | 無 | 無（距 20px） | 無 |

320×700 的 SPA：`innerWidth` 與 `scrollWidth` 都是 332，`clientWidth` 是 320。探出 332 的盒子是編年圓點軌裡的 `.stage-dot`（右緣約 746，在橫滑容器內）。360 及以上頁級沒有這個差。沿用上一輪對 320 的口徑，不另開 Critical。

Hero 控件在 320 的實測高度是 44。兩顆 CTA 之間約 10px。「開蒙」晶片仍是 44×36，這次 diff 沒有改 `.chrome`。

---

## 3. 檢測 list

覆蓋：M≤390 含 320／360／390，另測 414；D＝1280。頁面：HP 首頁 Hero、AX `#civ`、SL `#slice`、CLK 監測鐘、HUB `/civilization/` 的同一條脊柱。

### P0

| ID | 項目 | FAIL 條件 | 覆蓋 | 本席結果 |
|---|---|---|---|---|
| P0-HANDOFF-01 | 主行動進入 `#civ` | 銅金鈕或「開始編年」指向 `#slice`；Hero 內沒有 `#civ` | M≤390、D；實點 | **過** |
| P0-TOKEN-01 | 三章 token 只供 Hero，不換皮 | token 寫死在畫布；或改了 `#161c24` 軸底、鐘、開蒙、新聞卡；或出現 `#05060a` | HP、CLK、SL | **過** |
| P0-REVEAL-01 | SSR playing 時未到點的句子隱藏 | `playing` 而句子 opacity 為 1；boot 只改 mode、不改 `data-on` | SSR 360／390／1280 | **過** |
| K3-P0-SLICE／C-SLICE-COVER | `#slice` 標題在版頭之下 | h2 與版頭下緣的淨空不足 8px | 320／360／390／414／1280，390 含暗色 | **過**（最低 30.73） |
| K3-P0-CIV-EDGE | 手機脊柱不切半個節點字 | 靜止或盡頭把 `.lab`／`.yr` 切成半格 | 320／360／390／414；HUB 390 | **過** |
| K3-P0-BRASS／P0-CONTRAST-BRASS | 銅金鈕字 ≥ 4.5:1 | 實算對比低於 4.5 | 390 計算色 | **過**（4.77） |
| C-STAR-RESHUFFLE | 高度微變不重抽星 | 只改高度就換一組座標 | 390，高 844→838 | **過** |
| P0-OVERFLOW-01 | 頁級不橫向溢流 | `scrollWidth > clientWidth + 1` 且能把頁面拖出視窗 | 360／390／414／1280 | **過**。320 見第 2.2 節 |
| P0-OVERLAP-01 | Hero 不壓 `#civ`、鐘、開蒙 | 相交超過 1px | 上列視口 | **過** |
| P0-INK-01 | 基底是墨，不是原型純黑 | Hero 使用 `#05060a` | HP | **過**。中段 `#161c24` |
| P0-MOTION-01 | reduced-motion 直接 settled | reduce 仍自動播放 | 390 | **過**（SPA `settled`／`handoff`，七句 opacity 1） |
| P0-TOUCH-01 | Hero 控件 ≥ 44px | 跳過、重播、兩顆 CTA、提示的高 &lt; 44 | 320 settled | **過** |
| P0-TONE-01 | 宅幽默只留在 Hero | 新聞、導讀、懶人包、`homeCopy` 被改寫 | diff 對 `8b04723` | **過**（這些檔不在 diff） |
| P0-LEARN-01 | 8 科卡不得取代開蒙樹 | `/learn/` 失去萬有地圖 | `shared/learnPage.ts` | **過**（檔案不在本分支 diff；`tests/learn.test.ts` 在 383 裡通過）。本輪沒有重開開蒙殼畫面 |
| P0-CLOCK-01 | 監測鐘不被 Hero 改成秒錶 | 與鐘相交，或鐘模組被改 | 390 | **過**（距 20px；`clock.ts` 不在 diff） |
| P0-DEPS-01 | 不加 three／gsap／lenis | `package.json` 新增這三個 | 依賴 | **過**（`package.json` 不在 diff） |

### P1

| ID | 項目 | 本席結果 |
|---|---|---|
| P1-BOOT-01 | SSR 的 boot `<script>` 仍是 `.hero-opening` 的下一個兄弟，`.hero-opening + .axis-hero` 對不上。SSR 軸上緣多 **12px**。SPA 有 `.axis-mount`，縫是 0 | **仍在**。不相交，不升 Critical |
| P1-RAF-01 | settled 且人還看著 Hero 時，rAF 只在離屏、隱藏分頁、reduced-motion 才停 | **仍在**（程式路徑沒有改成隨 `finish()` 停畫） |
| P1-REPLAY-REDUCE | `replay()` 不看 reduced，減動態下按「重播開場」會把 mode 設回 playing | **仍在**（本輪未再點一次；元件仍是這條路徑） |
| P1-HYDRATE-01 | `createRoot` 換掉 SSR 節點，不是 hydrate。句子已在首繪前收起，殘留是可能的一幀 DOM 對調 | **仍在**，不再是全文閃現 |
| P1-MIN-FONT | `.hero-kicker` 用 `--civ-type-kicker`（0.6875rem＝11px） | **仍在**。Grok 上一輪列 P1。這次沒有改字級 |

### P2

| ID | 項目 | 本席結果 |
|---|---|---|
| P2-EDGE-01 | Hero 底緣 `#121820`、頂緣 `#1c2431`，與 `#civ` 的 `#161c24` 有一階色差。漸層這一行在修復 diff 裡沒有改 | 記錄。中段已是鎖死的墨。要拉平底緣可以另做，不擋這張票 |
| P2-TEST-01 | 上一輪測試鎖不住首繪 | 已補。boot 在 vm 裡斷言「先 `data-on=false`，再 `playing`」；跳過寫 seen；高度只變不重抽；對比 ≥ 4.5；脊柱靜止沒有半格。本席的 Chrome 實測與這些斷言一致 |
| P2-CHIP-01 | 「開蒙」晶片高 36 | 仍是既有 `.chrome`。不計入本席 Critical |

---

## 4. 必評項（再閘只寫有變動的）

獨白七句沒有改。書面語、宅幽默在 aside、diff 沒有碰到導讀、懶人包、`homeCopy`、新聞 pipeline、AdSense。口吻這條維持通過。

逐句浮現在生產首繪成立：無腳本的 SSR 頁在 CSS 已套用時，七句是隱藏的，CTA 在 playing 時 `visibility: hidden`。跳過會 settle 並寫下已看。減動態直接是完整靜態版。讀屏仍能走到 opacity 0 的句子，這點與上一輪相同，可以接受。

星空仍是一顆 2D canvas，沒有 three.js／gsap／lenis。種子場解決了網址列高度重抽。reduced-motion 只畫靜態幀。

與 chrome、軸、鐘、`#slice`：靜止首屏不相交。操作銜接改為先 `#civ`、後 `#slice`。兩條錨的 `scroll-margin` 都按實測版頭加 16px，h2 淨空約 31px。

8 科卡仍未做。開蒙樹不在這次修復裡。本席不要求 #186 補卡。

---

## 5. 開工建議

P0 必改已落地，本席沒有新的阻擋項。

可以留到下一包、不擋這張票的檔案級餘量：

| 檔 | 餘量 |
|---|---|
| `shared/heroOpening.ts` | boot `<script>` 放進 section 內或 `</body>` 前，消掉 SSR 那 12px。4 秒後備維持「不寫 seen」即可 |
| `src/components/HeroOpening.tsx` | `finish()` 之後停 rAF，留一幀完成態。`replay()` 在 reduced 時留在 settled |
| `src/App.css` | 若要消色階，只把 `.hero-opening` 底緣收到 `#161c24`。不要改 `.axis-hero`、`.bulletin-clock`、`.learn-page`、新聞卡 |

繼續延後：three.js／粒子大爆炸、水平 scroll-snap、學科 modal、`/learn/` 8 科捷徑（每張卡鏈現有樹，地圖與樹留著）。

不要為這包 redeploy Functions，不要開 Workers Paid，不要改 AdSense。

---

## 6. 過關票

本席（GLM 5.3）對 PR #186 在 `8859f38` 投 **PASS**。Critical = 0。

條件已經同時為真：銅金主行動進入 `#civ`；古暖金／今冷藍／未來紫黑三個 token 只在 Hero 上被畫布讀取，軸墨 `#161c24`、監測鐘、切片與開蒙皮沒有換；SSR `playing` 時七句隱藏；390 的「今日切片」在版頭下超過 8px；手機脊柱靜止與盡頭都不切半個節點字；銅金鈕對比 4.77:1；星野不因幾像素的高度變化重抽。360／390／414／1280 頁級沒有橫向溢流，Hero 不與 `#civ`、監測鐘、「開蒙」相交。

P1（SSR 12px 縫、settled 後 rAF、減動態重播、`createRoot` 換節點、11px kicker）留在下一包。這張票不同意在未有另兩席與 GM 簽字時合併或部署。

— GLM 5.3 席，2026-10-22 R2
