# world-news｜文明軸圖像落位 Layout Brief

**日期：** 2026-10-17 ~22:30 HKT  
**作者：** 網站架構及網頁排版專家  
**對象：** Bad Bot／CloudAgent／Art（並行）  
**範圍：** 可實裝槽位＋優先序；**唔改 IA**；唔等 Art 完稿先開槽  
**對齊：** `civilization-ia-2026-10-17.md` · mock `civilization-home-mock-2026-10-17/` · Art `ART-CIVILIZATION-AXIS-VISUAL-2026-10-17.md` · 現碼 `repo-cf/shared/civilizationPage.ts`  
**約束：** `#161c24` 墨軸＋紙感；mobile 優先；暗色唔失血；AdSense 過審前**零廣告腳本**維持；**無政治／臺灣圖**

---

## 0. 一句原則

圖像服務**尺度感同紙墨情緒**，唔搶深時間軸互動、唔把新聞璧回右欄。首屏震撼靠「墨底大氣 vignette + 節點旁時代剪影」；內頁靠「層卡封面 + 段落節奏圖」。缺圖時槽位隱藏或紙紋占位，**禁止空框死胡同**。

---

## 1. 全域規則（全槽共用）

| 規則 | 規定 |
|------|------|
| **格式** | WebP 優先，JPEG fallback；來源放 `public/static/civilization/`（新建；唔塞進 news CDN） |
| **命名** | `civ-{page}-{slot}-{w}w.webp`（例 `civ-home-axis-bg-1280w.webp`） |
| **lazy** | 首屏 LCP 圖 `loading="eager"` + `fetchpriority="high"`；其餘一律 `lazy` + `decoding="async"` |
| **尺寸屬性** | 必寫 `width`／`height`（或 CSS `aspect-ratio`）防 CLS |
| **srcset** | 手機 640／960；桌面再加 1280（axis-bg 可至 1920） |
| **object-fit** | 背景／封面＝`cover`；內文插圖＝`cover`（半寬）或 `contain`（圖表／年表示意） |
| **暗色** | 圖上覆蓋 `linear-gradient`／`mix-blend` 墨罩，保持 `#161c24` 可讀；`html.dark` 下 vignette 提高不透明度 8–12%，**唔** `filter: invert` 整圖（避免失血／假彩） |
| **紙感疊加** | 層卡／origins 插圖可用極淡 `paper-texture.jpg` 8–12% 疊在圖上（沿用 heritage），新聞切片區**唔**疊紙紋 |
| **alt** | 中文正式書面；描述題材＋年代尺度；**禁止**地名政治／臺灣／領袖臉／旗幟；裝飾性背景 `alt=""` + `aria-hidden="true"` |
| **紅線題材** | 允許：抽象粒子、石器剪影、館舍外觀、通車／基建、中性天際線、科學儀器、化石示意（非血腥）· **禁止：** 地圖政治焦點、戰爭、領袖 hero、臺灣相關任何視覺 |
| **無圖降級** | 槽位 DOM 唔渲染，或只留紙色／墨噪點占位（現有 `axis-hero::after` 噪點可當 fallback） |
| **廣告** | 本輪只加 `<img>`／CSS background；**唔**引入廣告／追蹤腳本 |

---

## 2. 槽位表

### A. 首頁 `axis-hero`（`#civ`）

| ID | 選擇器（建議） | 落位 | 建議尺寸 | lazy | alt 規則 | 互動約束 |
|----|----------------|------|----------|------|----------|----------|
| **H1** | `.axis-hero .axis-vignette`（`::before` 或子層 `div`） | 滿寬大氣背景，**在**標題／軸／CTA **之下**（z＜內容） | 1280×720 源；顯示 cover；手機裁中上 9:16 安全區 | **eager**（LCP） | `alt=""`（裝飾） | 必須 `pointer-events: none`；唔擋 `.milestones`／`.axis-node` 點擊 |
| **H2** | `.milestones .axis-node[data-era] .node-vignette` | 四節點**旁或底**小時代剪影（起源／技術／城市／今天） | 每枚 96×96～120×120；桌面可 144 | lazy（首屏可見者可 eager 起源＋今天） | 短 alt：「深時間起源示意」等；今天節點可省略圖只留亮點 | **唔**取代 `.dot`；剪影透明度 ≤0.35；hover／focus 仍以點＋字為準 |
| **H3** | （可選 P1）`.axis-hero .axis-edge-fade` | 左右／底緣淡出霧，加強長河感 | CSS only 或 64px 高 strip | — | — | 純裝飾 |

**實作注意：**  
- 背景用 **CSS `background-image` + 多層 gradient 墨罩**（上深下稍透），文字對比維持現況。  
- 現有 `::after` 噪點保留；vignette 作 `::before` 或首個子元素。  
- 桌面通欄背景仍破 gutter（對齊 Art §7）；內容跟現站 gutter。

---

### B. `/civilization/` hub

| ID | 選擇器（建議） | 落位 | 建議尺寸 | lazy | alt 規則 |
|----|----------------|------|----------|------|----------|
| **C0** | `.civ-hub-hero`（`article.civ-article` **前**可選） | 頂部紙感大圖＋短題覆墨／紙 | 1200×514（對齊现 `detail-hero` 21:9）或 1200×400 | eager | 「人類文明溫和史示意：紙感長河」類；無政治地圖 |
| **C1** | `.layer-card.layer-primary .layer-cover` | 起源層卡封面 | 640×400（顯示 16:10 或 4:3 crop） | lazy | 「人類起源／深時間」 |
| **C2** | `.layer-card.layer-secondary`（科技）`.layer-cover` | 科技層卡；頁未厚前可用科學館既有圖 | 同上 | lazy | 「科技與發現／公共科普」 |
| **C3** | `.layer-card.layer-secondary`（城市）`.layer-cover` | 城市層；可复用 `lm-*.jpg`／基建 OTD 圖 | 同上 | lazy | 「城市・基建・民生」 |
| **C4** | （可選）`.civ-milestone-list li .ms-thumb` | 里程碑列表旁小圖 | 120×120 | lazy | 對應該里程碑溫和題材 |

**版面：**  
- 層卡改為「上圖下文」：`.layer-cover` aspect-ratio 4/3 → `.era`／`h3`／`p`。  
- 次要層（未成頁）封面可低對比＋「尚未成頁」文案維持；有圖仍有助震撼，但**唔**假鏈去空庫存。  
- Hub 頂 hero（C0）**可選**；若今晚只開一條視覺線，**優先 C1–C3 封面**，C0 次之。

---

### C. `/civilization/origins/`

對齊正文結構（`originsSource.ts`）：總覽表 → 三階段（`### 一／二／三`）→ 「各里程碑溫和說明」多個 `###` → 本地錨。

| ID | 選擇器（建議） | 落位 | 建議尺寸 | lazy | alt 規則 |
|----|----------------|------|----------|------|----------|
| **O0** | `.civ-origins-hero`（`h1` 下或 crumb 下） | 頁頂全寬紙感／深時間氛圍圖 | 1200×514 | eager | 「深時間：人類起源溫和示意」 |
| **O1** | `.civ-figure` after「如何閱讀」或總覽表前 | 全寬：總覽尺度感（抽象時間河／化石剪影拼貼，非地圖主權） | 1200×600 | lazy | 含「約數／示意」字眼 |
| **O2** | `.civ-figure` 於「三階段」§一後 | 半寬（桌）／全寬（手機）：深層分離 | 800×500 | lazy | 階段名＋約略年代 |
| **O3** | 同上 §二後 | 非洲現代人多樣性（中性地貌／化石示意） | 同上 | lazy | 同上 |
| **O4** | 同上 §三後 | 全球擴張（**禁止**政治邊界地圖；用抽象擴散粒子／足跡示意） | 同上 | lazy | 標「示意、非精確路線」 |
| **O5+** | 每 **2–3** 個「各里程碑」`###` 插一張 | 交替全寬／半寬；避免每段一圖造成百科牆 | 全寬 1200×500；半寬 640×400 | lazy | 對應該組里程碑 |
| **O-cap** | `.civ-figure figcaption` | 圖下 caption | — | — | 1 行題材＋「約數／示意」；可附來源短名（非廣告） |

**目錄錨點：**  
- 現有 markdown 渲染出的 `h2`／`h3` id **保留**；插圖用 `<figure class="civ-figure">` **插在標題塊之後**，唔包住標題，唔改錨點 slug。  
- 手機：figure 全寬出血至 content gutter；caption 14px／muted。  
- 桌面：半寬 figure `float` 或 `grid` 與正文 1:1，caption 不越過主欄。

---

## 3. 優先實裝順序（今晚可開 PR）

### P0 — 今晚必須開槽（有占位即可合並；真圖可後補）

1. **H1** `.axis-hero` 大氣 vignette 槽（CSS 背景＋墨罩；無圖時噪點 fallback）  
2. **C1** 起源 `.layer-card.layer-primary .layer-cover`（hub＋首頁 aside 共用 `renderLayerAside`）  
3. **O0** origins 頁頂 hero 槽  
4. **O2／O3／O4** 三階段各一 figure 槽（固定 3 位，資料驅動 src）

**P0 PR 定義 of done：**  
- 選擇器／markup／CSS aspect-ratio／dark 罩落地  
- `src` 可先指向既有溫和資產（例：`/static/heritage/paper-texture.jpg` 深處理、`lm-science.jpg` 作層卡臨時封面）或 1×1 透明＋背景色  
- 無新廣告腳本；軸節點可點；`#civ`／`#slice` 不變  
- 缺真圖唔出破圖 icon（用 `onerror` 藏圖或 CSS 空態）

### P1 — 真圖到位後（Art 並行產出）

5. **H2** 四節點時代 vignette  
6. **C2／C3** 科技／城市層封面（可复用 landmarks）  
7. **C0** hub 頂 hero  
8. **O1**＋**O5+** 里程碑組圖（每 2–3 段一張）  
9. **C4** 里程碑小圖

### P2 — 過審後再考慮

- Ken Burns（已有 `.motion-img-ken` 可 opt-in；`body.static` 關閉）  
- 桌面 axis 加刻度裝飾圖  
- 懶人包「在文明軸上」章頭微圖

---

## 4. 建議 DOM 片段（給 CloudAgent；示意）

```html
<!-- H1：軸帶背景層（裝飾） -->
<section class="axis-hero" id="civ">
  <div class="axis-vignette" aria-hidden="true"></div>
  <!-- 現有 kicker / title / deep-axis / cta 不變 -->
</section>

<!-- C1：層卡封面 -->
<a class="layer-card layer-primary" href="/civilization/origins/">
  <div class="layer-cover">
    <img src="/static/civilization/civ-layer-origins-640w.webp"
         srcset="... " sizes="(max-width:600px) 100vw, 280px"
         width="640" height="400" alt="人類起源：深時間溫和示意"
         loading="lazy" decoding="async" />
  </div>
  <div class="era">深時間</div>
  <h3>人類起源</h3>
  <p>…</p>
</a>

<!-- O*：origins 插圖 -->
<figure class="civ-figure civ-figure--wide">
  <img … loading="lazy" decoding="async"
       alt="三階段框架·全球擴張示意（非精確遷徙路線）" />
  <figcaption>約 6–4 萬年前主浪潮 · 示意 · 年代為約數</figcaption>
</figure>
```

```css
.axis-vignette {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background:
    linear-gradient(165deg, rgba(22,28,36,.92), rgba(22,28,36,.78)),
    var(--axis-vignette-img, none) center / cover;
}
.layer-cover { aspect-ratio: 4 / 3; overflow: hidden; border-radius: 12px 12px 0 0; }
.layer-cover img { width: 100%; height: 100%; object-fit: cover; }
.civ-figure { margin: 1.25rem 0; }
.civ-figure--wide img { width: 100%; aspect-ratio: 2 / 1; object-fit: cover; border-radius: 12px; }
.civ-figure figcaption { font-size: 13px; color: #5c6570; margin-top: 6px; }
html.dark .axis-vignette { /* 提高墨罩 */ }
html.dark .layer-cover img { opacity: .92; }
```

---

## 5. Art 並行需求（唔阻擋 P0 開槽）

| 資產 | 優先 | 備註 |
|------|------|------|
| axis 大氣 vignette（墨底可讀、低調時代剪影） | **P0** | 橫圖；中央留字；無文字燒進圖 |
| 起源層卡封面 | **P0** | 4:3；紙感＋深時間 |
| origins 頁頂 hero | **P0** | 21:9 或 3:1 |
| 三階段插圖 ×3 | **P0** | 避免地圖國界；擴散用抽象 |
| 節點旁 4 枚小 vignette | P1 | 透明底 PNG/WebP |
| 科技／城市層封面 | P1 | 可指示复用 science-museum／基建 |

Art 色：落在 ink／paper／brass 體系；輸出標「示意·非紀實地圖」。

---

## 6. QA 抽查

- [ ] 手機首屏：軸標題＋四點可點；vignette 唔擋 CTA  
- [ ] `#civ`／`#slice`／origins 內 `h2`／`h3` 錨仍有效  
- [ ] 桌面 62／38：圖只在主欄軸／hub／origins；右 sticky 層卡可有封面，**新聞唔上右欄**  
- [ ] `html.dark` 文字對比唔掉；圖唔發紅／發灰失血  
- [ ] 無臺灣／政治視覺；無廣告腳本  
- [ ] Lighthouse CLS：大圖均有尺寸；LCP 不超過一張 eager 文明圖（首頁 H1）

---

## 7. 交付路徑

| 檔 | 路徑 |
|----|------|
| **本 brief** | `/workspace/world-news/CIVILIZATION-IMAGE-LAYOUT-BRIEF-2026-10-17.md` |
| IA（不變） | `civilization-ia-2026-10-17.md` |
| Mock | `civilization-home-mock-2026-10-17/` |
| Art 視覺 | `ART-CIVILIZATION-AXIS-VISUAL-2026-10-17.md` |
| 現碼錨點 | `repo-cf/shared/civilizationPage.ts`（`.axis-hero`／`.layer-card`／origins article） |

**站立批准 · 可直接派 CloudAgent 按 P0 開 PR。**

---

## 8. Art 概念板對照（2026-10-17 ~22:40 · 架構確認）

對齊 Art：`ART-CIVILIZATION-PRESENCE-VISUAL-2026-10-17.md` §7。源檔均 **1280×720** JPG（概念板）；上線前轉 WebP＋srcset。

| Layout 槽 | Art 源檔（今晚可掛） | 建議落位 CSS | opacity／crop 建議 | 狀態 |
|-----------|----------------------|--------------|-------------------|------|
| **H1** | `assets/civilization/heroes/home-axis-hero-v1.jpg` | `.axis-hero .axis-vignette` 底圖＋墨罩 | **0.40–0.45**（桌）；手機 **0.35**＋略厚墨罩；`object-position: center 42%`；金軸線讓給 UI `.rail`（圖線可再低 10% 對比） | ✅ 可掛 |
| **C0** | `…/heroes/overview-hero-v1.jpg` | `.civ-hub-hero` | **唔**當暗底透明層；作紙感 hero **1.0**，頂可薄 ink 8–12% 保標題；若裁 21:9 → 垂直居中保圓章＋左右層次 | ✅ 可掛 |
| **H2／C1** 起源 | `…/vignettes/node-origins-v1.jpg` | 層卡 `.layer-cover` 優先；節點旁需 **中心圓裁**（約 1:1） | 層卡 1.0；節點旁 ≤0.45 | ✅ 可掛（兼 C1） |
| **H2／C3** 城市 | `…/vignettes/node-city-v1.jpg` | 同上 | 紙底→層卡佳；暗軸節點旁建議再加 ink 圓罩或 Art 出暗底變體 | ✅ 層卡先；節點次 |
| **H2／C2** 科技 | `…/vignettes/node-tech-v1.jpg` | 同上 | 同城市 | ✅ |
| **H2** 民生 | `…/vignettes/node-life-v1.jpg` | 軸擴點／L3 thumb | 層卡或節點 | ✅ |
| **H2** 今日 | `…/vignettes/node-today-v1.jpg` | 軸「今天」可選；**優選只留亮點** | 紙色大底喺墨軸上易搶；建議 opacity ≤0.25 或唔掛、只用 `.dot.now` | ⚠️ 可選 |
| **O0／O2–O4** | （未出） | 跟 PRESENCE §3 | — | ⏳ Art 後補 |

**上線複製建議：**  
`assets/civilization/…` → `repo-cf/public/static/civilization/`（命名可暫用 `*-v1.jpg`，P1 再轉 `civ-*-{w}w.webp`）。

**架構唔改：** token、`#civ`／`#slice`、62／38、IA。只需 CloudAgent 換 src／掛槽。

**對 Art crop／opacity：** 見上表；**唔強制重產**——H1／C0／起源 vignette 可直接試落。若有餘力：① 節點用圖出 **暗底圓裁 480×480** 變體（城市／科技／民生）；② 今日節點可省略圖。

---

## 9. P0 上線路徑鎖定（Art 入庫 2026-10-17 ~22:28）

**靜態根：** `/static/civilization/`（repo：`repo-cf/public/static/civilization/`；見同目錄 `MANIFEST.md`）  
**JPEG** 與 webp **同 stem** fallback。

| 槽 | 選擇器 | 主檔（src） | srcset 建議 |
|----|--------|-------------|-------------|
| **H1** | `.axis-hero .axis-vignette` | `/static/civilization/civ-home-axis-bg-1280w.webp` | 640／960／1280／1920；CSS `image-set` 或 media | 
| **C1** | `.layer-card.layer-primary .layer-cover img` | `/static/civilization/civ-layer-origins-640w.webp` | 400／640；另有 `640x400` crop |
| **O0** | `.civ-origins-hero img`（或同 class 底） | `/static/civilization/civ-origins-hero-1200w.webp` | 640／960／1200 |
| **O2** | `.civ-figure[data-stage="1"] img` | `/static/civilization/civ-origins-stage1-800w.webp` | 640／800 |
| **O3** | `.civ-figure[data-stage="2"] img` | `/static/civilization/civ-origins-stage2-800w.webp` | 640／800 |
| **O4** | `.civ-figure[data-stage="3"] img` | `/static/civilization/civ-origins-stage3-800w.webp` | 640／800（粒子輻射；無國界） |

**掛載備註（與 §8 一致）：**  
- H1：opacity 0.40–0.45＋墨罩；`alt=""`／`aria-hidden`  
- C1：cover 4:3；alt「人類起源：深時間溫和示意」  
- O0 eager；O2–O4 lazy；figcaption 註約數／示意  
- IA／`#civ`／`#slice`／目錄錨點**不變**

CloudAgent：占位可撤，改掛上表路徑。
