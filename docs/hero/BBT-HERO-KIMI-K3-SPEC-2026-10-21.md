# 文明編年史 · 開場 Hero 規格（BBT Opening）

- 文件 ID：`BBT-HERO-KIMI-K3-SPEC-2026-10-21`
- 署名模型：**Kimi K3**（依 CREATE-BRIEF-3MODEL 以創作者身份交付，非閘審）
- 日期：2026-10-21
- 狀態：P0 可運行實作，隨本文件同 PR 交付
- 適用站：[world-news.xyz](https://world-news.xyz)（`jainaspp/world-news`）
- 上游文件：`CREATE-BRIEF-3MODEL`（權威）、`BRIEF-GM-ADOPT-2026-10-21`（方向 ADOPT）、`docs/gates/SITE-MAJOR-UPDATE-GATE.md`（站級閘）

---

## 0. 一句話

首頁第一屏變成一幕 15.6 秒的開場：奇點亮起、「砰」、原子湯、恆星點燃、地球出現，最後一句把讀者交到時間軸手上。墨紙 `#161c24`、2D canvas、逐句浮現，可跳過、可重播、每節只播一次，reduced-motion 直接給完整靜態版。

---

## 1. 敘事節拍（逐句旁白定稿＋timing）

七拍，書面中文，語氣是溫和的宅幽默（BBT 式 nerd aside），**只存在於 Hero**；新聞、導讀、懶人包維持書面正式中文，本文件不觸碰那些模組。旁白單一真源在 `shared/heroOpening.ts` 的 `HERO_BEATS`，SSR 與 React 共用，文案漂移由 `tests/heroOpening.test.ts` 鎖住。

| # | 時刻 | 主句 | 小字 aside | 畫面章節 |
|---|------|------|-----------|---------|
| 1 | 0.6s | 一百三十八億年前，宇宙甚麼都沒有。 | 連「甚麼都沒有」，也還沒有。 | 奇點 |
| 2 | 3.3s | 然後——「砰」。 | 其實沒有聲音：聲音需要空氣。 | 爆炸 |
| 3 | 5.4s | 最初的幾分鐘，只有光、熱，和一鍋原子湯。 | — | 原子湯 |
| 4 | 7.5s | 重力用一億年，把氣體捏成第一批恆星。 | — | 恆星點燃 |
| 5 | 9.5s | 恆星燃盡，把碳和氧撒回黑暗。 | 你體內每個原子，都住過恆星核心。 | 恆星點燃 |
| 6 | 12.1s | 九十億年後，一顆藍色小石頭學會了下雨。 | 再後來，故事有了讀者。 | 地球 |
| 7 | 14.4s | 現在，輪到我們了。 | 先看見尺度，再讀今天。 | 交接入軸 |

- **15.6s**：CTA 浮現、標記本節已看（`HERO_SETTLE_AT`）。
- 節拍設計原則：句子**揭示後不消失**。`at` 只需「註冊時間」而非完整閱讀時間——讀得慢的讀者不會失去任何一句，這也是不設自動換頁式輪播的原因。
- 與 prototype 的差異：保留「砰／沒有聲音」的宅梗但改寫節奏（開場兩句是 setup–punchline）；新增第 1 句 aside 的邏輯幽默與第 6 句「小石頭學會下雨」的地球章節；結尾不是「輪到我們了」就停，而是直接銜接本站軸的閱讀方法「先看見尺度，再讀今天」。
- 用字：書面語（甚麼，非什麼／乜嘢），全篇通過 `tests/copy.test.ts` 同款粒子掃描與 mainland 紅線掃描（已納入 `tests/heroOpening.test.ts`）。

## 2. 視覺分鏡

canvas 永遠是裝飾層（`aria-hidden`，`pointer-events: none`）；文字全程在無障礙樹裡。四個圖層以指數平滑（τ≈480ms）向各章節目標值收斂，章節切換無硬切。

| 章節 | 畫面 | 圖層目標（glow / stars / earth / line） |
|------|------|----------------------------------------|
| 奇點 singularity | 墨紙中央一點暖光，呼吸般微幅脈動 | 1 / 0 / 0 / 0 |
| 爆炸 bloom | 一道紙白擴散環，1.7s 內 ease-out 掃過畫面後消散（one-shot） | 0.3 / 0.1 / 0 / 0 |
| 原子湯 soup | 微亮粒子逐漸佈滿，慢速漂移閃爍 | 0 / 0.55 / 0 / 0 |
| 恆星點燃 ignition | 粒子全亮成星野，約 16% 為銅金星（呼應 `#c4a572`） | 0 / 1 / 0 / 0 |
| 地球 earth | 右下 0.74w/0.60h 亮起淡藍點（`#9ec0ef`，暗色主題主色）＋柔光 | 0 / 1 / 1 / 0 |
| 交接 handoff | 星野沉靜，底部銅金線自中央展開，接上 `.axis-hero` 的軌道色 | 0 / 1 / 1 / 1 |

- 交接一幕的空間隱喻：Hero 底邊的銅金線 → 下方 `axis-hero` 的 `.deep-axis .rail`，同色同源，敘事上「宇宙史交到文明軸手上」。
- 無音訊、無震動、無閃爍高頻：符合「溫和」品牌與監測鐘「禁恐嚇秒錶」精神——開場不嚇人，只敘事。

## 3. 技術選型與取捨

| 選項 | 決定 | 理由 |
|------|------|------|
| **2D canvas（採用）** | 一個 rAF 迴圈、≤210 粒子、DPR 封頂 2、無 shadowBlur（全部用 radialGradient 實現柔光） | 足以承載五個圖層；CPU 開支極低；手機不掉幀 |
| CSS transition | 句子與 CTA 的浮現 | 只動 opacity/transform；全部掛在 `prefers-reduced-motion: no-preference` 下 |
| WebGL / three.js / R3F | **不採用（P1 候選）** | GM BRIEF 已定調粒子大爆炸屬 P1，須過四大合議；P0 不為炫技拖 LCP |
| gsap / lenis | **不採用** | 站規明禁；時間軸只需 `setTimeout` 七顆＋一個 rAF |
| 圖片／webm 背景 | 不採用 | 零下載、零解碼開支；星野由程式生成，任何解析度一致清晰 |
| 新 npm 依賴 | **零** | 元件＋樣式＋資料合計約 7KB（gzip 前），bundle 無新 chunk |

**SSR／CSR 雙態同構（本站獨有約束）**：首頁由 `functions/index.ts` 以 `injectHomeShell` 伺服器渲染，React 之後接管 `#root`。若 Hero 只做 React，SSR 首繪沒有它，React 掛載時插入會造成整頁下移（CLS）。因此：

1. `shared/heroOpening.ts` 輸出與 React 完全同構的靜態標記，經 `wrapCivilizationHome({ hero: true })` 注入首頁（`renderHomeFeed` 只在 `pageH1` 為空——即純首頁——時開啟；focus 頁不開）。
2. SSR 預設 `data-mode="settled"`（全部句子可見）——無 JS、爬蟲、script 被擋的讀者看到完整版。
3. 段落後內聯 boot script（沿用 `CIV_MOTION_BOOT`／重大公告 inline script 的既有模式）在**首繪前**把合資格首次訪客翻成 `data-mode="playing"`，杜絕「全文閃一下才重播」。
4. boot script 附 4 秒保險：React 未接管（未設 `data-hero-boot`）就自動落回 settled，永遠不會卡在空 Hero。
5. React 掛載時以同一條件（seen flag／reduced-motion）初始化 state，與 SSR 狀態一致，無縫接管。

**播放策略**：
- 每節 session 只自動播一次（`sessionStorage['wn_hero_seen']`；用 session 而非 localStorage——下次造訪網站仍值得再看一次開場）。
- 已看／reduced-motion → 直接 settled（完整文字＋靜態星野＋CTA）。
- 「跳過開場」常駐右上（44×44）；「重播開場」在 settled 後出現於同位。
- 不鎖捲動、不擋點擊：讀者隨時可直接滾走，Hero 不綁架首屏。

## 4. 與現有 React chrome／軸／鐘／#slice 的銜接

首頁區塊順序（新 → 舊全部保留）：

```
.chrome（masthead＋civ-nav，不變）
.hero-opening          ← 新增（僅 poeticAxis 純首頁視圖）
.axis-hero（axis-slim） ← 緊貼 Hero 下緣（相鄰選擇器 margin-top:0）
.bulletin-clock        ← 不變，監測鐘獨立，無秒錶化改動
.chronicle-band / .axis-rails / OnThisDay / #slice …  ← 全部不變
```

- **掛載條件**：React 端 `poeticAxis`（ALL 地區＋全部分類＋無搜尋＋無來源＋time=today＋非書籤／追蹤視圖）才渲染；讀者一旦進入「找新聞」狀態（篩選、搜尋），開場自動讓位——Hero 是序章，不是每一頁的皮。
- **CTA**：「進入今日切片」→ `#slice`（沿用站級 `--civ-anchor-offset` 錨點位移）；「打開文明總覽」→ `/civilization/`。與軸帶兩顆 CTA 呼應但不同文案，不構成重複導航。
- **標題層級**：Hero 標題用 `<h2>`——`h1` 仍屬 `.axis-title`（poeticAxis 時），單一 h1 不變。
- **品牌**：kicker「文明編年史 · 開場」＋既有 masthead 字標，首屏五字完整（`P0-BRAND`）。
- **廣告**：Hero 內無廣告、不動 `homeAllowsAds`／AdSense 任何路徑。
- **資料驅動**：旁白為 `shared/heroOpening.ts` 的資料陣列，改文案＝改資料，SSR／React／測試三處自動一致。

## 5. 手機／桌面差異與降級

| 項 | 手機 ≤390 | 桌面 |
|----|-----------|------|
| 高度 | `clamp(430px, 84svh, 780px)`（svh 避開 iOS 網址列 100vh 陷阱；vh 行作 fallback） | 同式，900px 視窗約 756px |
| 排版 | 全置中單欄，左右 16px padding，無絕對定位文字層 | 同構，`.hero-inner` 上限 620px |
| 字級 | clamp：主句 ≈16px、標題 ≈30px、aside ≈13px（≥12px 紅線） | 主句上限 18.6px、標題 48px |
| 粒子 | 依面積密度 ≤210，DPR≤2 | 同式 |
| 觸控 | 跳過／重播／CTA／提示全部 ≥44×44，相鄰間距 ≥10px | 同 |

**無重疊的構造性保證**：所有句子在 normal flow 由首繪佔位，揭示只改 opacity/transform——兩個文字盒在任何時刻都不會相交（不是「調到不疊」，是「不可能疊」）。section 無 max-height，內容超出時整段自然長高，無裁字。

**reduced-motion 降級**（`prefers-reduced-motion: reduce`）：
- 直接進 settled：全文可見、CTA 可點。
- canvas 畫一幀靜態完成態（星野＋地球＋銅金線），無 rAF 迴圈。
- CSS 端另有獨立 reduce block 雙保險（`animation: none; transition: none`）。
- 與站級 `motion.test.ts` 契約相容：本區塊不新增 keyframes、不在全域 reduce 名單外加漏網動畫。

**效能**：
- LCP：Hero 無圖、無字型阻斷（沿用站既有非阻塞字型載入）；第一屏主要文字是系統可立即渲染的標題與第一句。
- CLS：SSR 與 CSR 同構標記＋句子預佔位＝0 位移。
- 省電：IntersectionObserver 出畫面即停 rAF；`visibilitychange` 分頁隱藏即停；settled 後星野仍以極低強度呼吸（可再議是否完全靜止，見已知限制）。

## 6. 已知限制（坦白清單）

1. **SSR→React 的 canvas 重啟**：SSR 的 `<canvas>` 是空的，React 掛載（約數百 ms）才開始畫。文字層無縫，星野層會晚幾百 ms 亮起——在「開場」語境下反而是開幕效果，但值得寫明。
2. **session 級已看記憶**：關掉分頁再開會重播（刻意選擇；若要跨 session 記憶改 localStorage 即可，一行的事，留給合議決定）。
3. **reduced-motion 於掛載時讀取**：播放中途切換系統設定不會即時降級（與站內其他動效一致）。
4. **settled 星野微亮呼吸**：reduced-motion 以外讀者 settled 後仍有低強度 twinkle；若閘審認為 settled 應全靜止，一個條件即可關閉。
5. **focus 頁與篩選視圖無 Hero**：刻意設計（見第 4 節），不是遺漏。
6. **未做 P1**：WebGL 粒子大爆炸、水平 scroll-snap 互動軸、學科 modal——依 GM BRIEF 屬 P1，待四大合議。

## 7. 為甚麼這不是「爛動畫」

1. **敘事先行**：每一幀對應一句旁白與一個宇宙學章節，不是為動而動的粒子池。
2. **工程約束寫進構造**：normal-flow 佔位（不可能重疊）、SSR/CSR 同構（不可能 CLS）、每節一次（不煩）、44px 觸控、純 transition+canvas（不拖 LCP）。
3. **品牌一致**：墨 `#161c24`、紙 `#f7f1e6`、銅金 `#c4a572/#9a7b4f`，零 `#05060a`；交接一幕直接長出本站軌道色。
4. **可測**：節拍、時長、紅線、粒子掃描、SSR 結構、掛載順序、CSS 閘全部進 `tests/heroOpening.test.ts`（7 例），全倉 374 例通過。
5. **可回退**：一個 `poeticAxis &&` 條件＋一個 `hero` 選項，拆掉即回原狀；不動新聞 pipeline、不動 AdSense、不動無關模組。

## 8. Preview 方法

```bash
npm ci
npm run dev        # http://localhost:5173/ — 純首頁視圖即見開場
# 重播：點「重播開場」；或 DevTools → sessionStorage.removeItem('wn_hero_seen') 後刷新
# reduced-motion：DevTools → Rendering → Emulate CSS prefers-reduced-motion: reduce
# SSR 標記（functions 路徑）：node -e "import('./shared/heroOpening.js').then(m=>console.log(m.renderHeroOpening()))"（經 tsx）
npm test           # 374 例，含 tests/heroOpening.test.ts 7 例
npm run build      # tsc --noEmit && vite build && prerender
```

視覺核對（本 PR 附截圖於 `docs/hero/shots/`）：360×800、390×844、1280×800，淺色／暗色，播放中／settled／reduced-motion。

## 9. 站級閘自評（SITE-MAJOR-UPDATE-GATE）

本改動命中 `TRIG-HOME`、`TRIG-ANIM`、`TRIG-TEMPLATE`，屬全站閘候選；以下為構造層面的對應，正式過閘仍需三席投票＋GM 簽字：

- `P0-OVERLAP`：構造性免疫（normal-flow 佔位，無絕對定位文字）。
- `P0-CLIP`：section 無 max-height、無 line-clamp；字級 clamp 下限保證 360px 不裁字。
- `P0-HSCROLL`：沿用 `.axis-hero` 同款 `-16px` bleed 模式，無新增寬度風險；canvas `inset:0` 不撐寬。
- `P0-TOUCH-44`：跳過／重播／CTA／提示全部 ≥44×44。
- `P0-BRAND`：kicker 含完整「文明編年史」，masthead 不變。
- `P0-CONTRAST`：文字色 `#e8e4dc/#a8b0ba/#c4a572` 對 `#161c24` 均 ≥4.5:1（kicker 與既有 `.axis-hero .kicker` 同色同規）。
- `P0-DARK-PAPER` / `P0-INK-TOKEN`：Hero 為墨紙帶，亮暗主題同色（與 `.axis-hero` 一致）；無 `#05060a`。
- `P1-MOTION`：全部動效掛 no-preference；reduce 雙保險。
- `P1-CLS`：SSR/CSR 同構＋佔位揭示，目標 0。
- `P1-PERF`：無圖無新依賴，canvas ≤210 粒子。
