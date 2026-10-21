# 首頁開場 Hero 規格 — 星塵序章（BBT 溫和宅幽默版）｜GLM 5.3 SPEC（2026-10-21）

- 產出者：GLM 5.3（依 CREATE-BRIEF-3MODEL，以創作者身份交稿）
- 對象網站：world-news.xyz（顯示品牌「文明編年史」；墨色 `#161c24`＋紙感）
- 輸入依據：`uploads/CREATE-BRIEF-3MODEL_4fd7.md`（PP O 原話＋硬約束）、`uploads/BRIEF-GM-ADOPT-2026-10-21_8f80.md`（GM ADOPT 有約束：獨白 7 句、P0 輕動畫、three.js 屬 P1 合議）、`uploads/prototype-index_549f.html`（意向稿，視覺可丟棄）
- 性質：SPEC＋實作同 PR（`docs/hero/` 本文件＋首頁 Hero 模組）。未動 AdSense、未動新聞 pipeline、未觸 Functions（純前端模組）。

---

## 0. PP O 原話與解讀

「開場搵三大做？」「我唔要你地做爛動畫 搵三大做比我」

→ **我係創作者，唔係閘審員。** 本 SPEC 交的是一套可落地的開場導演稿：敘事有定稿、分鏡有時間碼、程式有檔案、降級有階梯、每一條站級硬約束都有對應機制與證據。質感目標是「博物館序廳的開卷」，不是特效 demo。

藝術指導一句話：**「砰」不是火球，是一滴墨在紙上暈開。** 宇宙演化全程用站內既有語彙演出——墨底 `#161c24`、紙屑（cream）、黃銅（brass）、墨影——序章與下方文明軸共用同一套墨與黃銅，所以開場不是外來插件，而是一頁提前翻開的編年史。

## 1. 硬約束 → 機制對照（違反＝作廢）

| 硬約束（brief 原文） | 落地機制 | 證據 |
|---|---|---|
| 墨紙基底 `#161c24`，禁整站換純黑 `#05060a` | Hero 區塊 `background: #161c24`；全 CSS 無 `#05060a`；粒子色票只用 cream／brass／墨影三色 | §8、tests/hero.test.ts ink-ground gate |
| 溫和 BBT 宅幽默**僅 Hero**；新聞／懶人包仍書面正式 | 旁白全部收在 `shared/hero/heroNarrative.ts` 單一模組；其他檔案不得內嵌旁白字串（測試直接否定）；語氣閘禁末日／倒數／秒錶／恐慌字眼 | tests hero narration tone+wiring gates |
| 尊重 `prefers-reduced-motion` | reduce／`body.static`／已播過 → 免播路徑：一次 tableau 靜幀＋全文即現，不起 rAF | §7、gate 實測 360/390/768/1440-reduced |
| 唔為炫技拖死 LCP | 文案全部是 DOM 文字（opacity 揭示、零 display:none），canvas `aria-hidden` 純裝飾；無 gsap／lenis；無外部字體新增；DPR cap 2；粒子上限 250 | §6、§8 |
| 手機 ≤390 無重疊／裁字／overflow | `overflow: hidden` 出血護欄＋零固定寬度＋min-width:0 護欄＋44px 觸控目標；360/390 實測 scrollWidth=innerWidth、CTA 8 分隔 | §9、gate 實測 P0-01 全 PASS |
| Functions 配額緊張，唔 wrangler 狂 deploy | Hero 為純靜態前端模組，零 Functions 呼叫；本 PR 不 deploy | PR 描述註明 |

## 2. 敘事節拍（獨白七句定稿＋時間碼）

原則：七句（GM 拍板句數）；mild 側寫（較小較暗，如腳註）；每句必須在其時距內可讀完；不嚇人、不倒數、不末日。旁白＝DOM 文字段落（`data-beat`＝毫秒），與 canvas 分鏡共用同一條時間軸。

| # | kind | start | 文案定稿（不可改字） | 搭景 |
|---|---|---|---|---|
| 1 | line | 900ms | 話說，一百三十八億年前——什麼都沒有。 | void：空墨紙，中央一枚黃銅種子呼吸收緊 |
| 2 | **bang** | 6400ms | 然後：「砰」。 | 墨滴暈開：三圈環（cream 領先、brass 跟進、墨影殿後）＋一口被壓上限的微光（α≤0.12，短於 270ms） |
| 3 | aside | 8200ms | 好吧，嚴格來說沒有「砰」。聲音需要介質，而當時連介質本身都還在成形。 | drift：粒子減速漂移；閃光已熄 |
| 4 | line | 11600ms | 重力把氫氣捏成一顆顆恆星，恆星再把鍛好的新原子撒回太空。 | galaxy：兩條對數旋臂把粒子收攏成盤；黃銅核心開始呼吸 |
| 5 | line | 14900ms | 你身上的每一粒原子，都曾在恆星核心裡上過班。 | 14600ms 起七座「恆星鍛爐」在臂上定點閃爍 |
| 6 | line | 18400ms | 四十六億年前，星塵聚成地球——後來，故事有了讀者。 | earth：紙印「地球燈籠」自右下角升起，泊入天空錨位 (0.78w, 0.26h)，帶月環 |
| 7 | aside | 21900ms | 接下來，輪到我們出場。向下捲動，編年開始。 | settle：黃銅髮絲線在 0.875h 浮現（與軸帶同款），交接語 |
| CTA | cta | 22900ms | 「開始編年」→ `#civ`；「先看今日切片」→ `#slice` | 黃銅實鈕＋幽靈鈕並排；scroll hint 落點動畫啟動 |

節拍間距：900→6400（5.5s 留白蓄勢）→8200→11600→14900→18400→21900→CTA 22900。定稿＝`HERO_CTA_MS` 隨後 `HERO_SETTLE_END_MS=23400` 收束，ambient 以半幀率續航。

## 3. 視覺分鏡（相位機 state machine）

相位常數（唯一 truth：`HERO_PHASES`，painter／reveal／測試三方共讀）：

| 相位 | 起 | 畫面 |
|---|---|---|
| void | 0ms | 空墨紙。種子半徑 2.6→0.9px、halo 極弱 (α≤0.38)、640ms 呼吸週期 |
| bang | 6400ms | 墨滴暈開，環徑至 minDim×0.66，easeOutCubic 各滯後 0/0.16/0.34；微光 α≤0.12 且 15% 內衰減 |
| drift | 8200ms | 暈開減速；粒子曝 α≤0.8；殘影微移 |
| galaxy | 11600ms | 旋臂對數 spiral（wind 5.2、盤 y 壓 0.72、內快外慢差速）；核心 brass 呼吸 α≤0.16 |
| earth | 18400ms | 燈籠 1.8s easeOutBack 入軌後 ±1.6px 浮沉；月環 0.55px/ms 慢軌；盤面三塊墨綠陸地＋上緣 cream 反光 |
| settle | 21900ms | 髮絲線 0.9s 淡入 0.875h；23.4s 後 ambient 幀率減半（`frame % 2`） |

落位幾何（避讓敘事／CTA）：星系中心 (0.5w, 0.46h)；地球泊位 (0.78w, 0.26h)——kicker 右鄰、旁白帶上方、CTA 列上方所有視口淨空（含 360px）。地球半徑 clamp(minDim×0.05, 13, 30)px，小屏縮小不出血。

## 4. 技術選型與取捨（P0 決定稿）

| 選項 | 決定 | 理由 |
|---|---|---|
| **2D canvas（單元件）** | ✅ 採用 | 一個 `aria-hidden` canvas 同時容納 120–250 粒子＋環＋星系＋地球＋髮絲線；手機支援最好；DPR cap 2；可整體繞過（裝飾層） |
| **DOM 文字節拍** | ✅ 採用 | 讀者與檢索引擎看到的必須是文字不是畫素；opacity 揭示零 layout shift（節點常駐文檔流）；無 JS 也是完整文案 |
| **CSS 只負責紙感／微動** | ✅ 採用 | vignette 紙紋、seal、CTA、hover、scroll hint；`@keyframes hero-hint-fall` 僅一處 |
| **three.js／R3F／WebGL 粒子** | ❌ P0 不採用 | brief 定為 P1 候選、須四大 model 動畫合議先過；先證敘事成立再談 GPU 升級 |
| **gsap／lenis** | ❌ 拒絕 | 站級既有紅線：不為炫技拖 LCP、不加依賴。時間軸用 60 行原生 rAF 主鐘即可表達 |
| **Web Audio「砰」聲** | ❌ 拒絕 | 自動播放音訊是反 UX；旁白第 3 句正正是「嚴格來說沒有砰」，視覺留白即梗 |

架構理由（回應「點解唔係爛動畫」）：爛動畫的通病是「隨機噪點＋無時碼＋不管手機」。本作把開場做成**可驗證的編舞契約**——旁白秒數、相位邊界、粒子種子（mulberry32, seed=20261021，即 SPEC 日期）、泊位座標全部寫死並三方共讀；每次載入播同一部片（authored choreography, not Perlin noise）；painter 不持時鐘，永遠只畫「t 毫秒的那一幀」，所以 DOM 揭示與布景天然同拍、可暫停可對齊；離屏／切頁即停，回來續播。這是導演稿＋演出紀律，不是粒子 demo。

## 5. 主鐘與生命週期（`src/components/HeroOpen.tsx`）

- `useLayoutEffect` **在首繪前**上臂 `html.hero-motion`（隱藏態 CSS 才不會慢到；dev 注入 CSS 也不會閃現全文）；揭示 transition 只掛 `.is-said` 態，隱藏態直接吸附、出場仍 700ms 升起。
- 單一 rAF 主鐘：累進 elapsed，`sayPast()` 依 `data-beat` 順序揭句（單向、不回跳）；`elapsed≥23400` → `markSettled()`（`is-settled`、寫 `sessionStorage['wn-hero-played']`、1200ms 後撤 hero-motion——文案永不因晚渲染再被藏）。
- 暫停紀律：`IntersectionObserver`（threshold 0.01，離屏即 cancelAnimationFrame，elapsed 凍結）＋`visibilitychange`；回歸即續播同一秒。
- 保險絲：`setTimeout(23400+4000)` 牆鐘 failsafe——任何極端節流下文案不可能長期隱藏。
- 每會話只播一次：`wn-hero-played` 命中 → 免播路徑（同 §7）。重整新 tab 才重播。
- 揭示用 class，不動 style 內聯；所有監聽與 observer 在 cleanup 全拆。

## 6. 檔案與職責

| 檔案 | 職責 |
|---|---|
| `shared/hero/heroNarrative.ts` | 旁白七句、相位常數、CTA/收束/tableau 常數、DPR cap、session flag、`heroPhaseAt()`、`heroProse()`。旁白唯一住所 |
| `src/hero/heroCosmos.ts` | `CosmosPainter`：無時鐘、固定種子、單幀繪製 `drawFrame(tMs)`／`drawTableau()`；DPR clamp、寬度大變才重播種 |
| `src/components/HeroOpen.tsx` | React 元件：主鐘、揭示、暫停、session 防重播、CTA 平滑捲動、failsafe |
| `src/App.tsx` | `HeroOpen` 掛 `.civ-home` 內、`.axis-mount` 之上（首頁唯一；不污染其他路由） |
| `src/App.css`（hero 段） | 樣式、揭示 gating、vignette、scroll hint、`body.static` 凍結、手機護欄（併入既有 phone-hub 640 區塊） |
| `tests/hero.test.ts` | 18 條契約測試（§12） |

## 7. 降級階梯（五路殊途同歸：全文必在）

| 路徑 | 行為 |
|---|---|
| `prefers-reduced-motion: reduce` | 不上 hero-motion；`drawTableau()` 一幀定格（27.4s 的成角畫面）＋全文即現＋`is-settled`；無 rAF |
| `body.static`（站級靜態模式） | 同上 |
| 同會話二訪（session flag） | 同上（開場是迎賓不是收費站） |
| JS 失敗／被擋 | CSS 未上臂＝預設可見；canvas 空白但紙感 vignette 仍在 |
| 極端節流 | 23.4s＋4s failsafe 全揭 |

reduce 下 resize 重畫一次 tableau；粉塵、CTA、kicker 全部照常。

## 8. 效能預算

- 一個 canvas、120–250 motes（按面積 `w×h/6200`），DPR clamp(1..2)；settle 後幀率減半。
- 離屏 0 幀：IO 離屏即停; 切頁即停。
- 文字即 LCP 主體（DOM 常駐、opacity 揭示零 CLS 零 display:none）；canvas 是純裝飾層，不阻文字渲染。
- 無新依賴、無新字體、無網路請求；bundle 新增 ≈ 3KB min+gzip（painter+component+narrative）。
- 全綠：`npm run typecheck` ✅、`npm run lint` ✅、`npm test` 385/385 ✅（63 檔）。

## 9. 手機／桌面差異（≤390 重點）

| 面 | 桌面 | 手機（含 360/390） |
|---|---|---|
| 布局 | `min-height:86svh` 墨帶，閱文欄 max-width 720px（≥720px 760px） | 同帶；`.hero-open/.hero-inner` min-width:0＋max-width:100% 護欄；CTA 可換行 |
| 字級 | clamp(1.125rem, 1.6vw+0.82rem, 1.6rem)；「砰」行 clamp(1.5rem, 2.3vw+1rem, 2.15rem) | 同 clamp 自動收級；`overflow-wrap:break-word` 防裁字 |
| 粒子 | 上限 250 | 按面積自動降（≈120@360×~700） |
| 地球 | r≤30px | r clamp 下限 13px;泊位比例同 (0.78w, 0.26h) |
| 觸控 | — | CTA min-height 44px（P0-04）、gap 10px、padding 10/16；雙鈕實測不相疊 |
| 出血 | `overflow:hidden` 護欄 | 同左＋scrollWidth=innerWidth 實測 PASS |

實測（Chrome headless）：360/390/768/1440 × motion/reduced 全 8 組 PASS：零橫向溢流、零裁字、品牌字樣完整、CTA ≥44px 不相疊在框內、`#civ` 軸帶在下方、`#slice` 錨點完好、motion 組 canvas 持續作畫（luminance variance）、reduced 組畫面凍結（像素 hash 前後一致）、tone 閘無禁詞。

## 10. 與現有 chrome／軸／鐘／#slice 銜接

- 掛載序：`.civ-home` 內 `HeroOpen → axis-mount（#civ）→ 監測鐘 → 編年 → rails → #slice`。Hero 即站級「開卷」，軸序 古→今→未來 不動。
- CTA `#civ`：`.civ-home .axis-hero { scroll-margin-top: var(--civ-anchor-offset) }` 保證錨點停在 sticky chrome 之下（TRG-6 錨點規則）。
- CTA `#slice`：沿用站級今日釘；`scrollIntoView({behavior: scrollBehavior()})`——reduce 時自動改 instant。
- 語域防滲：旁白僅 `heroNarrative.ts` 一處；`HOME_INTRO`／新聞／懶人包字串零改動（測試鎖死）。
- 監測鐘規則不變：無任何秒錶／倒數元素進入 Hero。
- 主題：hero 常駐墨底（與 `.axis-hero` 同哲學），`html.dark` 下加深內影；兩主題皆墨紙。

## 11. P1 後備（須另走合議，本 PR 不含）

1. three.js/WebGL 粒子升級（GM：需四大 model 動畫合議；屆時只替換 painter，契約常數不變）。
2. 旁白多語言變體（narrative 模組已資料驅動，加 locale 即可）。
3. 開蒙導引版同款節奏（GM 允許 Hero／開蒙導引用同口吻）。

## 12. 測試證據

- `tests/hero.test.ts`（18 條）：七句嚴格遞增＋首句≥800ms＋末句≤23s；bang 鎖 canvas 相位；禁末日／倒數／秒錶／恐慌／災難／滅亡／死線；`.hero-open`≥44px、`.hero-inner`、`.hero-narration` 無固定 px 寬（P0-03）；reduce 區塊 `animation:none/transition:none`;scroll-margin 錨點規則；painter 無 rAF、DPR clamp、無 `#05060a`。
- 全套件：63 檔 385 測試 PASS；兩個既有結構性測試（`tests/civilization.test.ts` phone-hub 區塊、`tests/future.test.ts` 軸段切片）不受影響，PASS。
- 視覺閘實測（headless Chrome，8 組視口）：ALL GATES PASS（明細 §9）。

## 13. 已知限制

- 每會話只播一次（by design）；QA 重看需新分頁或清 `sessionStorage`。
- reduce／靜態模式是一張定格分鏡（27.4s 成角），無 ambient 旋轉——這是「靜如標本」的正確代價。
- 微光閃一下（α≤0.12、<270ms）在極低階 GPU 上仍可能感受不到——它本來就應該幾乎感受不到。
- 23 秒對返回訪客太長，因此 session guard 一律直接落座；但**首次**訪客若中途滾走，時間軸會暫停等他回來（failsafe 27.4s 兜底全揭）。
- composer 3KB 已含在 PR 內；bundle 影響微小但非零。
- 本 SPEC 未含audio（刻意）、未含 WebGL（P1 合議）。

## 附錄 A：常數一覽（改這些＝同 PR 必須同步本表與測試）

| 常數 | 值 | 註 |
|---|---|---|
| `HERO_PHASES` | void 0 / bang 6400 / drift 8200 / galaxy 11600 / earth 18400 / settle 21900 | ms |
| 節拍 1–7 | 900 / 6400 / 8200 / 11600 / 14900 / 18400 / 21900 | ms `data-beat` |
| `HERO_CTA_MS` | 22900 | CTA 列揭 |
| `HERO_SETTLE_END_MS` | 23400 | 收束、ambient 起點、幀率減半 |
| failsafe | 27400 | 牆鐘強制全揭 |
| `HERO_TABLEAU_MS` | 27400 | 靜態定格分鏡時刻 |
| `HERO_MAX_DPR` | 2 | 手機幀預算 |
| `HERO_PLAYED_FLAG` | `wn-hero-played` | sessionStorage 防重播 |
| seed | 20261021 | 每次載入同一部片 |
| motes | 120–250 | `w×h/6200` clamp |
| 地球泊位 | (0.78w, 0.26h) | 全視口避讓敘事/CTA |

—— GLM 5.3 署名，2026-10-21。本 SPEC 附完整實作（§6），可直接本地／preview 驗收；合併前照站級閘走 GM 合併閘。Manifesto: the bang is an ink drop, and the reader is the medium.