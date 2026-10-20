# 站級重大更新檢測清單（Kimi K3 獨立版）

- 文件 ID：`SITE-REVIEW-CHECKLIST-KIMI-K3-2026-10-20`
- 產出者：Kimi K3（三大獨立檢測 list 之一，供 GM 與 Grok 4.7、GLM 5.3 版本合併為唯一上線閘）
- 日期：2026-10-20
- 適用站：world-news.xyz（顯示品牌「文明編年史」；墨色 `#161c24`＋紙感 `#f7f1e6`，暗色 `#0E141C`）
- 依據：`SITE-MAJOR-UPDATE-GATE-BRIEF-2026-10-20.md`
- 事故參照：`civ-mobile-broken-2026-10-20.jpg`——手機文明 hub 的軸（axis）、編年圓點（chronicle dots）、「跳到今日切片」CTA、模式卡（pattern pills）四層互相重疊仍上線；內容過審但無視覺閘。本清單第 3 節專門回堵此缺口。
- 非目標：不更動任何 app／CSS／runtime 程式碼；不重寫文明文案；不開新產品線。本文件僅為閘規。

---

## 1. 重大更新觸發定義（GATE-TRIGGER）

### 1.1 判定總則

以「渲染層是否改變」為準，不以改動行數或檔案數為準。凡會改變任何頁面在任何視口下的像素結果、層疊順序、捲動行為或互動路徑者，一律視為候選重大更新。邊界案例由 GM 裁定，裁定結果寫回本文件。

### 1.2 觸發全站閘（FULL GATE）——命中任一條即觸發

| ID | 觸發條件 |
| --- | --- |
| TRIG-HOME | 首頁 `/` 版面、區塊順序、首屏構成、今日切片 `#slice` 掛載位置或軸帶（axis band）有改動 |
| TRIG-CIV | 文明 hub `/civilization/`、編年 `/civilization/chronicle/` 的結構、軸、圓點、CTA、模式卡／圖版（pattern board／pills）有改動 |
| TRIG-GLOBAL-CSS | 全域 CSS、design tokens（墨色 `#161c24`、紙感底色、字體、間距階梯、z-index 階層）、`App.css` 共用層有改動 |
| TRIG-NAV | 導航列、頁首、頁尾、品牌區塊、語言切換、暗色開關的位置或行為有改動 |
| TRIG-ANIM | 動畫系統、捲動驅動效果、sticky／fixed 行為、IntersectionObserver／ResizeObserver 相關邏輯有改動 |
| TRIG-ROUTE | 路由結構、URL 規則、重新導向、深鏈錨點（含 `#slice`）有改動 |
| TRIG-TEMPLATE | 共用頁面模板（`shared/civilizationPage`、`homeTemplate`、新聞頁模板等）產出之 HTML 結構有改動 |
| TRIG-ASSET | 品牌 logo、字體檔、全站共用圖像、favicon、og-image 有改動 |
| TRIG-LAYOUT-JS | 任何在 runtime 改變版面之 JS（廣告槽、骨架屏、延遲掛載、主題切換）有改動 |
| TRIG-VIEWPORT | viewport meta、安全區（safe-area）、100vh 相關處理有改動 |

### 1.3 免閘（SKIP GATE）——同時滿足才免閘

| ID | 條件 |
| --- | --- |
| SKIP-TYPO | 單篇內文的錯字、標點、譯名修正，不動模板與樣式 |
| SKIP-SINGLE-POST | 單篇新聞／文章的新增或下架，走既有模板且無新版面元件 |
| SKIP-DATA-PIN | 資料釘選（資料針）調整：排序權重、置頂旗標、數字更新，不動渲染結構 |
| SKIP-META | 單頁 description／關鍵字等不外顯之中繼資料微調 |

免閘不等於免檢：仍須通過 CI 與一次手機首頁目視 smoke（一張截圖附於 PR）。凡「順手改了一點 CSS」即自動升級為全站閘，不得歸類免閘。

---

## 2. 檢測清單（P0 必殺／P1 應修／P2 建議）

### 2.1 覆蓋面代號

- 視口（viewport）：
  - `M`＝手機 ≤640px（基準 360×780，加測 390×844；含 iOS Safari 底欄收縮情境）
  - `T`＝平板 641–1024px（基準 768×1024）
  - `D`＝桌面 ≥1025px（基準 1440×900）
- 頁面（page）：
  - `H`＝首頁 `/`
  - `C`＝文明 hub `/civilization/`
  - `N`＝編年 `/civilization/chronicle/`
  - `L`＝開蒙 `/learn/`
  - `S`＝今日切片 `/#slice`（含自錨點直達落點）
  - `A`＝新聞頁（story／article，取當日最長標題一篇＋一般一篇）
- 每條列出最低覆蓋要求；標「全」者表示 M/T/D × H/C/N/L/S/A 全數覆蓋。

### 2.2 P0 必殺項（任一 FAIL 即阻擋上線）

| ID | 項目 | 判定 FAIL 條件 | 覆蓋面 |
| --- | --- | --- | --- |
| P0-OVERLAP-01 | 無元素重疊：軸、編年圓點、CTA、模式卡、導航、卡片、裝飾層之間不得非設計性相交 | 任兩個文字或互動元素的 bounding box 相交超過 2px，或視覺上可辨識的壓字、壓圖、壓鈕；本次事故之四層堆疊（軸／圓點／CTA／模式卡）為首要檢查組合 | 全；C、H、S 為重災區，M 視口必測 |
| P0-HSCROLL-02 | 無橫向溢出 | `document.scrollingElement.scrollWidth > window.innerWidth + 1`；或軸軌道等橫滑容器與頁面垂直捲動互撞（滑動被劫、回彈卡死）；body 出現橫向捲軸 | 全 |
| P0-CLIP-03 | 無裁字 | 任何文字被 `overflow:hidden` 截斷而無省略號與無替代讀法；標題、chips、pills、圓點標籤被容器切邊；直排或 serif 標題缺筆畫感之截切 | 全；M 視口與最長標題案例必測 |
| P0-CTA-04 | 「跳到今日切片」等 sticky／fixed CTA 不遮內容、不被遮 | CTA 於任何捲動位置覆蓋正文或其他互動元素；或被 BackToTop、頁首、廣告槽覆蓋導致無法點擊；點擊後錨點落點被 sticky 頁首遮住 | M/T × H/C/S |
| P0-TOUCH-05 | 觸控目標 ≥44×44px | 編年圓點、模式 pills、導航 chips、CTA、語言切換之可點區任一邊 <44px，或相鄰互動目標間距 <8px 致誤觸 | M/T 全頁 |
| P0-ZIDX-06 | z-index 與層疊正確 | 紙紋、軸線、裝飾層蓋住內容致不可讀或不可點；sticky 頁首壓住錨點落點；彈層（語言選單等）被內容層反壓 | 全 |
| P0-NAV-07 | 導航全程可用 | 主導航於 M 視口換行溢出、被截或不可達；任一導航連結 404；品牌區塊未連回首頁 | 全 |
| P0-BRAND-08 | 品牌字樣「文明編年史」正確完整呈現 | 出現錯字、簡體混入（如「编年史」）、logo 破圖、被截、與底色同色系致不可讀；`<title>`／og:site_name／頁首三處不一致 | 全 |
| P0-CONTRAST-09 | 墨色 `#161c24`×紙感底、暗色 `#0E141C` 模式對比達標 | 正文對比 <4.5:1，大標題 <3:1（WCAG AA）；暗色模式出現「黑字壓黑底」或紙紋層吃掉對比 | 全，亮暗各一套 |
| P0-ROUTE-10 | 六頁路由與深鏈健全 | H/C/N/L/S/A 任一直連 404、白屏、ErrorBoundary 觸發，或 `#slice` 錨點失效 | 全 |
| P0-RENDER-ERR-11 | 無阻斷性腳本錯誤 | 載入後 console 出現未捕捉 exception／unhandled rejection 且伴隨任何區塊未渲染或互動失效 | 全 |
| P0-INK-TOKEN-12 | 墨色／紙感 token 置換無漏網 | 改動 token 後仍有元件算出色值落在舊值（以 DevTools computed style 抽檢軸、CTA、模式卡、頁首、頁尾），或亮暗模式混色 | 全 |

### 2.3 P1 應修項（原則上阻擋上線；豁免須 GM 簽核並附修復期限）

| ID | 項目 | 判定 FAIL 條件 | 覆蓋面 |
| --- | --- | --- | --- |
| P1-PERF-01 | 行動端效能 | M 視口 4G 節流下 LCP >2.5s 或 INP >200ms；首屏 hero 圖未壓縮或未設寬高 | M × H/C/A |
| P1-CLS-02 | 版面穩定 | CLS >0.1；字體 swap、骨架屏、廣告槽或延遲掛載造成可見位移 | 全 |
| P1-ANIM-03 | 動畫與減動態 | 未遵從 `prefers-reduced-motion`；捲動動畫掉幀或與 sticky 元素打架 | M/D × H/C/N |
| P1-IMG-04 | 圖像健全 | 缺 alt、破圖、寬高比塌陷、非首屏圖未 lazy 而拖慢 LCP | 全 |
| P1-AD-05 | 廣告槽不推擠版面 | AdSlot 載入或空槽收合造成 CLS 或蓋住內容；免閘改動亦須附此項 smoke | H/A，M 必測 |
| P1-I18N-06 | 中英雙語版面 | 切換語言後斷行溢出、按鈕爆框、英文長字衝出容器；雙語頁首高度不一致致跳動 | 全（抽 H/C/A 雙語） |
| P1-FONT-07 | 字體載入策略 | FOIT 超過 3s 無 fallback；serif 標題 fallback 後字寬差異造成標題換行改變壓到其他層 | M/D × H/C |
| P1-STICKY-08 | sticky 跨瀏覽器一致 | iOS Safari 與 Android Chrome 任一 sticky／fixed 行為差異導致 CTA 或頁首漂移、抖動、失效 | M × H/C/S |
| P1-FOCUS-09 | 鍵盤與焦點 | Tab 順序跳躍不合邏輯、focus 框不可見、焦點被隱藏層吃掉 | D 全頁 |
| P1-META-10 | 頁面中繼資料 | 六頁任一 `<title>`、description、og 標籤缺漏或與品牌字樣不一致 | H/C/N/L/S/A |
| P1-DARK-11 | 暗色模式完整性 | 暗色下殘留亮色區塊（漏白）、圖片白邊、紙紋層未切換、system 偏好切換後狀態錯亂 | 全 |

### 2.4 P2 建議項（不阻擋上線，記入 backlog）

| ID | 項目 | 判定 FAIL 條件（作為改善依據） | 覆蓋面 |
| --- | --- | --- | --- |
| P2-PRINT-01 | 列印版面 | 列印時軸／CTA／導航未隱藏、新聞頁內文截斷 | D × A/N |
| P2-SWIPE-HINT-02 | 橫滑提示 | 軸軌道可橫滑但無任何視覺提示（漸層邊、箭頭、半遮卡） | M × H/C |
| P2-SKELETON-03 | 骨架屏一致 | 骨架屏與實際卡片高度差 >24px 造成載入跳動 | M × H/A |
| P2-SEO-04 | sitemap／feed 同步 | 新頁未入 sitemap、feed.xml「今天切片」未隨重大更新驗證 | 站級 |
| P2-A11Y-NAME-05 | 無障礙命名 | 互動元素缺可辨識名稱（aria-label／可讀文字），圓點僅以顏色區分狀態 | 全 |
| P2-BACKTOP-06 | BackToTop 錯位 | BackToTop 與固定 CTA 距離 <8px 或於小機互相遮擋邊角 | M 全頁 |
| P2-OG-IMAGE-07 | 分享預覽圖 | og-image 未反映新首屏主視覺 | H/C |

---

## 3. 視覺／佈局陷阱（VISUAL TRAPS）——每一條都能攔下本次事故截圖

事故重述：手機文明 hub 上線版本中，軸（axis）、編年圓點（chronicle dots）、「跳到今日切片」CTA 與模式卡（pattern pills）四層在小視口互相重疊，內容審核通過、無人做視覺驗收，直接上線（見 `civ-mobile-broken-2026-10-20.jpg`）。以下陷阱為上線前必跑之視覺程序，任一項報警即回到第 2 節對應 P0 條目。

| ID | 陷阱 | 做法 | 對本次事故之攔截點 |
| --- | --- | --- | --- |
| TRAP-V01 | 窄機全長截圖對照 | 360×780 對六頁各取「全長」截圖（非僅首屏），與上一穩定版像素 diff；diff 熱區落在軸／CTA／模式卡者人工覆核 | 重疊在四層交界處，全長截圖一眼可見；僅截首屏會漏 |
| TRAP-V02 | 元素碰撞掃描（bounding-box） | 以腳本枚舉所有互動元素與文字節點，計算 bounding box 交集；相交 >2px 且非父子／非設計層疊者列報告 | 軸帶、圓點列、CTA、pills 的 box 交集會直接成表，零通融 |
| TRAP-V03 | 絕對定位＋負 margin 審計 | 列出全站 `position:absolute/fixed` 與負 margin 元件，逐個在三視口核對其參照容器與堆疊對象 | 軸與圓點若以絕對定位掛於同一容器，窄機換行即互相壓疊，審計表會點名 |
| TRAP-V04 | sticky／fixed 堆疊情境 | 不只檢查靜止態：捲到頁中、捲到底、錨點直達（`/#slice`）三態各截一張，確認 CTA 與頁首、BackToTop 的相對層 | 「跳到今日切片」CTA 在捲動中壓住編年圓點即在此態現形 |
| TRAP-V05 | 橫滑容器與直滑互撞 | 在軸軌道上做斜向滑動與快速滑動，確認 `touch-action` 與巢狀捲動不會劫走頁面捲動或回彈卡死 | 手機上軸可橫滑而頁面不可直滑（或反之）即為同族缺陷 |
| TRAP-V06 | 長字／斷行壓力測試 | 以當日最長真實標題與最長 pill 文案注入，於 360px 檢查斷行後高度是否推擠出重疊 | 事故版本多因文案比設計稿長，換行後 pills 壓上 CTA |
| TRAP-V07 | 暗色＋紙紋層對比抽檢 | 暗色模式對紙紋、軸線、墨色字各取樣點算對比 | 防止修復時只修亮色，暗色下圓點與軸線消失或糊成一片 |
| TRAP-V08 | 真機滑動（非僅模擬器） | 至少一支 iOS Safari＋一支 Android Chrome 真機，完整滑完文明 hub 與首頁 | DevTools 模擬不會重現網址列收縮、橡皮筋捲動造成的層疊位移 |
| TRAP-V09 | 100vh／動態視口陷阱 | 檢查所有 `100vh`／`100dvh` 元件在網址列展開與收縮兩態的高度 | CTA 若以 `100vh` 定位，iOS 底欄收縮瞬間即壓住軸末端 |
| TRAP-V10 | 安全區（safe-area）核查 | 有瀏海／手勢條機型檢查 `env(safe-area-inset-*)` 是否套用於固定 CTA 與頁尾 | CTA 貼底未讓位手勢條，與 pills 搶最後一行空間 |

執行要求：TRAP-V01、V02、V04 為自動化＋人工雙軌，結果附於上線證據；TRAP-V08 允許以雲端真機替代實體機，但不得只用桌面瀏覽器模擬。

---

## 4. 過關規則建議（PASS RULE 提案）

1. 投票結構：三大檢測者（Kimi K3、Grok 4.7、GLM 5.3，或其接任者）各自對合併後的唯一清單逐項判定 PASS／FAIL，互不觀看對方結果後再彙整，保持獨立性。
2. 通過門檻：
   - Critical＝0 為硬條件。Critical 定義：任一 P0 項 FAIL，或品牌字樣錯誤、大面積不可讀／不可點、首頁或文明 hub 白屏級事故。
   - 3/3 PASS 且 Critical＝0 → 自動通過。
   - 2/3 PASS 且 Critical＝0，且歧見全落在 P1／P2 → GM 裁決，裁決理由留檔。
   - 任一檢測者報 Critical → 直接 FAIL，整批退回，不接受「先上再補」。
3. P1 豁免：僅 GM 可簽豁免單，須附修復期限與回歸檢測日；豁免項於下期回歸時自動升為 P0 覆核。
4. 必要證據（缺一不可）：
   - 截圖：6 頁 × 3 視口 × 亮／暗共 36 張全長截圖；首頁與文明 hub 另加「頁中」「錨點直達」兩態各 3 視口（+12 張）；檔名規則 `{page}-{viewport}-{light|dark}[-scroll].png`。
   - TRAP-V02 碰撞掃描報告：結果必須為零碰撞，或逐條附 GM 認可之設計性層疊說明。
   - console 無阻斷錯誤之截圖或錄影（對應 P0-RENDER-ERR-11）。
   - Lighthouse 行動端分數截圖（對應 P1-PERF-01、P1-CLS-02）。
   - 真機滑動短錄影兩支（iOS、Android 各一，對應 TRAP-V08）。
5. 簽字：GM 為唯一上線簽字人；三位檢測者於證據包署名（模型署名模型名）。缺任一署名或任一證據，簽字無效。
6. 回歸：上線後 24 小時內對 M 視口重跑 TRAP-V01 一次，截圖併入同一證據包結案。

---

## 5. 附錄 A：jd-tech-landing 適用摘錄（jainaspp.github.io/jd-tech-landing）

同源閘精神全數適用，按站型裁減如下：

- 觸發定義（第 1 節）原樣適用；該站為單一 landing page，TRIG-CIV、TRIG-ROUTE 改解讀為「頁內 section 順序／錨點導航改動」。
- P0 全數保留並改寫覆蓋面：H/C/N/L/S/A 六頁收斂為「單頁 × 各 section（hero、功能、卡片區、頁尾）」；P0-OVERLAP-01、P0-HSCROLL-02、P0-CLIP-03、P0-CTA-04、P0-TOUCH-05、P0-CONTRAST-09 為該站最高風險項，不得裁減。
- 品牌檢查（P0-BRAND-08）改用該站自身名稱與 logo 基準；墨色 `#161c24`＋紙感為 world-news.xyz 專屬，不強制套色，但對比門檻（4.5:1／3:1）不變。
- 視覺陷阱 TRAP-V01–V10 全數可重用；TRAP-V05 若該站無橫滑容器可標 N/A 並留註。
- 過關規則：證據截圖量改為「1 頁 × 3 視口 × 亮／暗＋各 section 錨點態」；投票可降為 2/2（兩位檢測者）＋站主簽字，Critical＝0 硬條件不變。

## 6. 附錄 B：名詞對照

| 中文 | English | 說明 |
| --- | --- | --- |
| 全站閘 | FULL GATE | 重大更新必過之完整檢測 |
| 免閘 | SKIP GATE | 第 1.3 節條件全滿之低風險改動 |
| 必殺／應修／建議 | P0 / P1 / P2 | 阻擋級別 |
| 碰撞掃描 | bounding-box scan | TRAP-V02 之自動化重疊偵測 |
| 證據包 | evidence bundle | 截圖＋報告＋錄影＋署名之合集 |

— 本清單由 Kimi K3 獨立產出，僅供閘規合併使用；不包含任何程式碼更動。
