# 文明編年史優化稽核（GLM 5.3 座 · 2026-10-23）

**性質：** 獨立優化稽核（docs-only）。唔係 site-major 閘票，唔係 TRAP-V08。
**審計對象：** https://world-news.xyz/ · /civilization/ · /civilization/chronicle/ （live, fetched 2026-10-23）＋ main 分支 chronicle 源碼（#198 已併）。
**鎖定產品契約：** uploads/BRIEF-GM-ADOPT-2026-10-22_b6c6.md（三卷疊十階）；uploads/FIX-BRIEF_5901.md（#198 後 known fixes）。
**證據：** live HTML 快照（/tmp）；headless Chrome 390/360 視窗截圖（非真機，故手機觀察只作描述，唔當 Critical 閘票）。

---

## 1. Executive summary

- GM P0「三卷疊十階」已隨 #198 上線並通過實測：`/civilization/chronicle/` 有 `#ch-ancient/#ch-now/#ch-future` 扉頁、`#stage-1..10` 全存、「今天」無年代詞誤用、stage-10 正文 1,445 漢字＋5 條 https 來源（超過 ≥400 字＋≥4 來源門檻）。本輪**無新 P0 產品缺口**。
- 編年頁最大結構痛點係**導航層疊**：正文前有四組 chip 導航（跳到卷 3＋跳到階段 10＋模式卡＋案例），而各卷 band 內又重列該卷階段 chips——同一批 `#stage-N` 連結出現三次，390/360 下卷一正文被推到約三屏後。
- 總覽頁「人類起源」出現**三次**（深時間卡、文明層卡、起源摘要節），且首頁與總覽的軸／今日落點／三卷卡／文明層高度同構——重複敘事可用低成本去重。
- 效能無新發現：LCP 責任在已有 #238；chronicle 圖片有 width/height＋webp srcset，CLS 基本受保護。`#major-slot` 重大更新橫幅喺編年頁排喺麵包屑之上（總覽已搬到軸下），行為不一致兼壓低正文。
- In-flight PR 有兩個治理位要 PP O 裁決：#225/#232 同檔競爭 learn 樹要二擇一；#224（卷一加厚）與 GM「古凍結」紀律有張力。

---

## 2. Findings 與建議修法

| ID | Severity | Area | Finding（live 證據） | Proposed fix | Effort | Depends on open PR? |
|----|----------|------|----------------------|--------------|--------|---------------------|
| `chron-stage-nav-dupe` | P0 | IA／導航 | 編年頁 `#stage-N` 導航出現三次：頁首「跳到階段」10 chips＋各卷 band 內 5+5 chips＋（模式卡／案例 nav 亦喺正文前）。390 截圖所見，lede＋如何閱讀＋四組 nav 先佔約三屏。 | 頁首只留三卷 chips；階段 chips 只留喺各卷 band（讀者落到卷先見刻度）。所有 `#stage-N` 錨不變，契約零風險。 | S | 與 #223/#224/#227 同檔（chronicle.ts），排佢哋之後 land |
| `civ-hub-origins-triple` | P0 | IA／導航 | 總覽頁「人類起源」三現：深時間 board 卡、文明層 layer-card、內文「起源摘要」節。宇宙／地球卡亦與軸敘事重疊。 | 深時間 board 收窄為宇宙／地球兩卡；起源單留文明層卡＋摘要節其一；導語一句對應刪減。 | S-M | 否 |
| `chron-major-slot-below-axis` | P1 | 手機 UX | `#major-slot` 重大更新橫幅喺編年／子頁排喺 breadcrumb 之上（live HTML：`major-slot` idx < `#content`）；總覽已有 `moveHubSignalsBelowAxis` 搬到軸下，行為不一致，兼把正文推低。 | 將同款 move helper 套用到 chronicle／tech／city／earth／cosmos／origins 殼。 | S | 否 |
| `stage45-http-sources` | P1 | 內容／來源 | stage-4／5 主來源（中國錢幣博物館兩條）係 `http://`，來源表照排 http 連結；https 站引 http 鏈可信度與部分 in-app 瀏覽體驗差。 | 逐條測 https 可達性：可達改 https；不可達留 http 但加「機構官方頁」註記。順手掃整張來源表。 | S | 建議夾 #224 review 一齊驗（佢重寫同節 prose） |
| `question-index-vol-group` | P1 | IA／導航 | 問題索引把 chronicle／tech／earth／pattern 錨平鋪，無三卷分組（GM P1 已列）。 | 索引分 古／今／未來 三組＋一組跨層；錨不變。 | M | 否 |
| `monitor-clock-vol3-ref` | P1 | 末日鐘／銜接 | 監測鐘只喺首頁（`renderBulletinClock` 僅 home）；編年卷三卷首無監測讀數痕跡，讀者由編年入未來時鐘不在視野。GM P1 明言「監測鐘模組可引用喺卷三卷首」。 | 卷三 band 加一行靜態連結「監測刻度 → /#monitor」；不搬模組、無秒針、無倒數。 | S | 與 #223/#227 同檔，排佢哋之後 |
| `learn-chronicle-bridge` | P1 | 開蒙／銜接 | learn 頁 live 僅約 430 漢字，與編年無內容級互鏈；學完一門無歷史落點。 | learn 每門加一條「對應編年刻度」深鏈（如門＝stage-7 → `#stage-7`）；等 learn 樹定版後做。 | S | 是（#225/#232 二擇一之後） |
| `future-door-touch-parity` | P1 | 手機 UX | 卷三章門 F1–F6 六條 inline `<a>` 密排一行，觸控目標細過 44px 規格（其餘 chronicle-nav chip 已有 min 44×44）。 | F1–F6 改用同款 chip 樣式（44×44、flex wrap）。 | S | 與內容 PR 同檔，排 Wave C 後 |
| `axis-swipe-hint-360` | P2 | 手機 UX | 首頁 deep-axis @360 下一節點 peek 可能不足 8px（FIX-BRIEF A3 已列）；headless 截圖未能量化，**唔當 Critical**。 | 保證 ≥8px peek（padding-inline-end 或收窄 node min-width）；唔移除 `overflow-x:auto`。 | S | 與 #240 相鄰範圍 |
| `word-ratio-gate` | P2 | 內容平衡 | 今／未來 vs 古篇幅比無測試閘（GM P2）；stage-4（2,309 字）與 stage-5（552 字）等節奏差全靠人手。 | 內容 PR 全 land 後加一條比例斷言入 tests（只測下限，唔鎖死上限）。 | S | 是（#223/#224/#227/#233/#234 land 後） |
| `volume-cover-art` | P2 | 動畫／視覺 | 三卷入口卡純文字，三卷視覺區分弱（GM P2 三卷封面）。 | 加輕量 webp 封面（優先重用既有素材，唔新做圖古卷——注意古凍結紀律）。 | M | 否（閘風險低） |
| `footer-stage-alias` | P2 | IA／導航 | 頁腳無舊十階名對照（GM P2）；舊錨用戶由站外深鏈入仍可達，但站內無對照表。 | 頁腳或編年頁尾加「舊十階名 ↔ 卷內刻度」一行對照。 | S | 否 |
| `chron-motion-flash` | P2 | 效能／CLS | `civ-reveal` 觀察器有 1500ms boot fallback，但 below-fold 段落仍有「先隱後現」閃動窗口（描述性，無實測）。 | 維持現狀；若真機片證實明顯閃動，考慮 `content-visibility` 方案。**閘風險：中**（改 reveal 行為會掂 P0 動畫紅線）。 | S | 否 |

動畫／視覺整體判斷：現站級動畫（chip 過渡、reveal、軸 gradient）屬「適中」，無過度；所有 hero 開場新動畫提議（#235–#237、#239）一律 **閘風險：高**，park 喺 #241 wire（PP O HOLD）有裁決之後，本稽核唔建議任何一條先動。

---

## 3. Top 5 must-do this week（有序）

1. **`chron-stage-nav-dupe`（P0, S）** — 編年頁頁首撤「跳到階段」10 chips，階段 chips 留各卷 band。錨不變、契約零風險、一次 CSS/模板小 PR，即刻解決 390/360 正文被推三屏的閱讀節奏。
2. **`civ-hub-origins-triple`（P0, S-M）** — 總覽去重：深時間 board 收宇宙／地球兩卡，起源單留一個入口。跟 GM P0-1「兩邊都撤重複」尾段執行。
3. **`chron-major-slot-below-axis`（P1, S）** — 橫幅下移與總覽對齊，正文回歸第一屏；順便統一六個 civ 子頁殼。
4. **`stage45-http-sources`（P1, S）** — 來源 https 可達性檢查＋來源表全掃，夾 #224 review 一齊驗，保住「可核對」承諾。
5. **`question-index-vol-group`（P1, M）** — 問題索引三卷分組，完成 GM P1 清單最後一塊低成本項（監測鐘卷三引用 `monitor-clock-vol3-ref` 可同 PR 或尾隨）。

---

## 4. 唔做（本輪明確排除）

- **唔建議 merge #241**（Hero wire）——PP O 已 HOLD，本稽核尊重並維持；#235–#237／#239 hero 動畫提案全部 park。
- 唔搬 F1–F6 全文入編年卷三——GM 定 P0 章門已達標，遷移係 P1 可選項，留畀 GM/PP O 另決。
- 唔開新路由（含 `/civilization/future/`）、唔加 PAGES 鍵、唔加第十一階、唔刪 `#stage-N`、唔改錨名。
- 唔引入 gsap／lenis；監測鐘唔加秒針、唔加倒數、唔入 future publishedText。
- 唔改 AdSense／新聞 pipeline／`#slice` 業務邏輯。
- 唔重提 in-flight 項目（#223/#224/#227/#233/#234/#225/#232/#228/#240/#238）做新工——上表只在它們的基礎上排程或補驗收。
- 唔喺無 iOS Safari＋Android Chrome 真機片（TRAP-V08）前，把手機觀察升級為 Critical 閘票；本文件所有手機 finding 只作描述。
- 本文件 docs-only：唔觸發站級三大閘、唔 deploy、唔改產品碼。

---

## 5. In-flight PR 合併／排程建議

同檔衝突事實：#223／#224／#227 三條內容 PR **都改 `shared/civilization/chronicle.ts`**——必須串行；#233 只改 `future.ts`、#234 只改 `cosmos.ts`，可與之平行。#225 與 #232 **同改 learn 四件套**（catalog/learnPage/App.css/tests），係競爭方案。

| Wave | PR | 理由／條件 |
|------|----|------------|
| A（即 land） | #228 a11y、#240 home chip overlap | 細修、獨立檔、無內容衝突；先清走檯面 |
| B（site-major 必含） | #238 LCP | FIX-BRIEF §B1：下次 full gate 冇佢會直接 FAIL；唔可以再 waive |
| C（內容串行，chronicle.ts） | #227（vol2 6–7）→ #223（vol2 8–10）→ #224（vol1 1–5）**有條件** | 先今後古：#227/#223 完成卷二即達 GM「今加厚」主目標；**#224 與 GM「古凍結」有張力——PP O 裁決「採」先 merge，「唔採」就 close 並留 low-risk 補注**。每條 land 後重跑 chronicle floor 測試 |
| D（內容平行，異檔） | #233 vol3 F1–F6、#234 cosmos | 與 Wave C 並行無衝突；land 後加驗證集同步檢查（GM P1 要求） |
| E（learn 二擇一） | #225 **或** #232 | 同檔競爭：PP O/GM 揀一條，輸家 close。揀完先做 `learn-chronicle-bridge` |
| HOLD | #241 wire（PP O HOLD）；#235/#236/#237/#239 hero 提案 | 唔建議 merge；wire 有裁決後先重議開場 |
| 新工（本稽核） | Top 5 各一條小 PR | 排 Wave C 之後（同檔者）；`civ-hub-origins-triple`／`chron-major-slot-below-axis` 可即刻開工（異檔） |

---

*GLM 5.3 座 · 2026-10-23 · docs-only draft，唔含任何產品碼變更。*
