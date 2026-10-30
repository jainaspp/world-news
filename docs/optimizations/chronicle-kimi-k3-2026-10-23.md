# 文明編年史 · 優化審計（Kimi K3 獨立席）

**日期：** 2026-10-23（Asia/Hong_Kong）
**性質：** 優化審計提案（optimization audit）。**非**站級三大閘投票、**非** TRAP-V08、**不**改產品碼、**不**合併任何 PR。
**方法：** 擷取 live 三頁＋四個相關樞紐（cosmos／origins／tech／city／earth／learn），對照 main 分支 `shared/civilization/*` 來源；並用 headless Chrome（CDP）在 360／390 實測版面數值。
**產品鎖：** `BRIEF-GM-ADOPT-2026-10-22`（三卷疊十階；新聞＝`/#slice`；古凍結／今加厚／未來章門 P0）、`FIX-BRIEF`（post-#198 Critical-soft）。

---

## 1. Executive summary（五點）

1. **三卷 P0 骨架已上線且正確**：編年頁有 `#ch-ancient`／`#ch-now`／`#ch-future` 扉頁錨，`#stage-1…10` 全保；首頁與總覽都是三卷入口卡、無十階卡複製；未來章門只鏈總覽 F1–F6，符合 GM 採納稿。本輪審計找到的問題在**下一層**：行動端捲動陷阱、首頁／總覽敘事重複、監測鐘資料陳舊。
2. **唯一實測 live 缺陷（新發現、無 PR 覆蓋）**：編年頁 `.civ-article` 全文章在 360px 可橫向捲動 **218px**（來源表實測 546px 寬、URL 不折行所致）。CSS 小修即解，列本審計唯一 P0。
3. **首頁與 `/civilization/` 是近重複頁**：`today-pin`、`civ-near`（5 格）、`layers`（三大文明層）三段 HTML **逐位元相同**，外加同款軸與同款三卷卡。IA 與 SEO 都該拉開分工（P1）。
4. **監測鐘 `MONITOR_READING.asOf = 2025-01-28`**：首頁「1 分 29 秒」資料日期至今約 21 個月未更新，模組本身合規（無秒針、無恐嚇），但「監測」可信度靠更新紀律；一行修正＋一條陳舊跳線測試（P1）。
5. **內容加厚全部已有 PR（#223／#224／#227／#233／#234），本審計不重複提案**；本篇只排合併次序：同檔案（`chronicle.ts`）的三支加厚 PR 必須**串行**進，`future.ts`／`cosmos.ts` 可並行。#241 維持 PP O HOLD。

---

## 2. 發現總表

Severity 定義：**P0**＝本週應修之 live 缺陷（無 PR 覆蓋）；**P1**＝重要、排進下一個迭代；**P2**＝打磨。Effort：S＝單檔小修；M＝跨檔或需產品決策；L＝跨頁結構調整。

| ID | Severity | Area | Finding | Proposed fix | Effort | Depends on open PR? |
|---|---|---|---|---|---|---|
| `chron-mobile-table-scroll-trap` | **P0** | 手機 UX | 實測 360px：整個 `.civ-article` 橫捲 218px（390px 時 188px）。根因 `.civ-article{overflow-x:auto}`（`src/App.css:1985`）遇上 `.civ-table` 實測 546px 寬——來源表 38 行、10 條 URL＞60 字元且 `/` 不產生折行點。整頁正文可被誤推 sideways，屬捲動陷阱。文件級 `scrollWidth` 為 0，閘腳本測不到此容器內捲。 | 把 `overflow-x:auto` 從 `.civ-article` 收到新 `.table-scroll` wrapper（只包表格）；`.civ-table td a{overflow-wrap:anywhere}`；360 快照驗收 `article.scrollWidth===article.clientWidth`。純 CSS＋一條測試。 | S | 否（新工作） |
| `home-hub-dup-blocks` | **P1** | IA／導航 | 首頁與 `/civilization/` 的 `today-pin`（272 字元）、`civ-near`（2,213 字元、5 格）、`layers`（1,956 字元）三段 **HTML 逐位元相同**；另有同款 7 節點 `deep-axis` 與同款三卷卡。兩頁敘事職分不清：讀者分不清「總覽」比首頁多了什麼，搜尋引擎見近重複。 | 產品分工：首頁＝入口（軸＋三卷卡＋切片，撤 `layers` 與 `civ-near`，`today-pin` 留）；總覽＝全量（保留三段）。改 `src/App.tsx`（SPA 首頁組裝）與 `shared/civilizationPage.ts` 兩條 render 路徑；先定分工再落碼。 | M | 否 |
| `bulletin-clock-stale` | **P1** | 內容／末日鐘 | `shared/civilization/clock.ts` 寫死 `minutes:1, seconds:29, asOf:'2025-01-28'`。live 首頁展示「資料日期 2025-01-28」，距今約 21 個月。模組文案合規（編輯寫定、無秒針），但年度公報節奏已過一期。 | 對照原子科學家公報最新公開值更新讀數與 `asOf`（值以公報為準，不憑記憶寫）；加一條 tripwire 測試：`asOf` 距今＞13 個月即 fail，提醒年度更新。 | S | 否 |
| `chron-top-nav-redundant` | **P1** | IA／導航 | 編年正文前疊 **4 條 nav**：跳到卷（3 chips）＋跳到階段（10 chips）＋模式卡（3）＋案例專篇（1）。而「跳到階段」10 chips 與章扉頁自帶的「古卷刻度」「今卷刻度」（各 5 chips）完全重複——同頁十階 chips 出現三次；「案例專篇」一整行只有 1 chip。手機首屏被 chrome 吃掉約 200px，三卷 vs 十階的第一眼層級被沖淡（GM P0-1 的目標）。 | 撤頂部「跳到階段」10-chip 行（章內刻度已由章扉頁承擔）；模式卡＋案例併成一條「先例」nav；保留「跳到卷」。改 `renderChronicleArticle`＋`renderPatternNav`／`renderCaseNav`，契約錨全不動。 | S–M | 否 |
| `question-index-volume-group` | **P1** | IA／內容 | 總覽 `#question-index` 現為平鋪 15 問，無三卷分組。GM 採納稿 P1 已列「問題索引三卷分組」，目前**未有 PR** 承接。 | `shared/civilization/questions.ts` 每問加 volume 標記，hub 分三組渲染（古／今／未來＋今日近層）；`questionIndexIssues` 驗證集同步。 | M | 否（屬 GM P1 未承接項） |
| `volume-chip-vs-stage-chip` | **P2** | IA／視覺 | 「卷一 古」與「01 史前」用同一 `.chip` 樣式，三卷與十階視覺同權重，第一眼難分層級。 | 卷 chips 加 modifier（如 `.chip-volume`：銅邊＋襯線），階 chips 維持現狀；純 CSS，不動錨。 | S | 否 |
| `axis-today-label` | **P2** | 文案 | `shared/civilization/spine.ts:117` 軸節點標「今天」（副標「切片」）。GM 拆義：軸／章名用「今」，「今天」主義＝`/#slice`。軸是年代位置，此處屬年代詞用法（civ-nav 的「今天→/#slice」屬主義用法，保留）。 | 軸節點主標改「今」、副標留「切片」，href 不變；全站文案掃描一併複核。 | S | 否 |
| `no-11th-stage-repetition` | **P2** | 內容節奏 | 「不另立第十一階」在編年頁出現 **3 次**（階10 正文、階10 橋、卷三章門），屬編輯契約句滲入讀者正文；「本世紀／當代」自指句亦 6 見。 | 保留契約要求的橋句（SCHEMA 有硬性句），階10 正文內的自指句刪或併；先核對 `SCHEMA.md` 哪句屬契約再動。 | S | 否（改前核 SCHEMA） |
| `future-panel-mobile-weight` | **P2** | 手機 UX／內容 | 總覽 `#future` 現有 6 域＋11 卡＋4 檢查點（約 4,606 漢字），#233 加厚後更重；全頁 939 tags 為三頁之最。手機長捲無分節摺疊。 | 檢查點／horizon 卡用原生 `<details>/<summary>` 摺疊（**無 JS 庫**，不觸動畫閘線）；或等 GM P1「留總覽 vs 遷卷三」定案後再動結構。摺疊前確認厚頁字數閘（`CHRONICLE_MIN_CHARS` 類檢查）不受影響。 | M | 依 GM P1 決策；與 #233 協調 |
| `learn-stub-nav-dependency` | **P2** | 開蒙銜接 | 主 nav「開蒙」直達 `/learn/`：現頁 noindex、正文約 421 漢字、12 葉中 9 葉「尚未開啓之路」。斷層已被認領（#225／#232），但兩支未合前，nav 流量進的是 stub。 | 不另開新工作：#225 先、#232（taxonomy v2）後；#232 落地前 nav 維持現狀、不加推廣位；編年頁內文暫不新增指向 learn 的內鏈。 | S（排序而已） | **已有 PR**：#225、#232 |
| `fonts-dup-preconnect-blocking` | **P2** | 效能 | 首頁 `<head>`：Google Fonts CSS 為 render-blocking（無 `media=print` 切換，chronicle／hub 已有 async 寫法），且 `fonts.googleapis.com`／`fonts.gstatic.com` preconnect 各重複一次。 | 首頁字體改 async 載入＋去重 preconnect。`index.html` 在 #238 範圍內，**先核對 #238 是否已含**；無則單開 micro-PR 或併入。 | S | 可能已被 #238 覆蓋（需核對） |
| `deep-axis-swipe-peek` | **P2** | 手機 UX | 實測 360px：`deep-axis` 隱藏 243px（可捲），第 5 節點（城市）peek 約 20px——略好於 FIX-BRIEF A3 記錄，但 scrollbar 隱藏下仍弱。 | FIX-BRIEF A3 方案：padding-inline-end 或收窄 node min-width，保證 ≥8px peek；**勿**移除 `overflow-x:auto`。先核對 #228 的 `src/App.css` 改動是否已含。 | S | 可能已被 #228 覆蓋（需核對） |
| `membership-surface-absent` | **P2** | 會員銜接 | 全站無會員／登入表面（僅 RSS subscribe）。審計鏡頭問「會員與編年銜接」——現無可銜接之物。 | 列入「唔做」：本輪不建議新增會員系統；learn 的本機進度（localStorage）已覆蓋輕量需求。 | — | — |

### 已有 PR 覆蓋（不重複提案，僅登記）

| 發現 | 狀態 |
|---|---|
| 卷一 stages 1–5 正文偏薄（實測連里程碑塊 552–685 漢字） | **已有 PR** #224 |
| 卷二 stages 6–7／8–10 加厚 | **已有 PR** #227、#223 |
| 卷三 F1–F6 加厚 | **已有 PR** #233 |
| cosmos 加厚（現約 2,525 漢字） | **已有 PR** #234 |
| 開蒙樹（stub→taxonomy v2） | **已有 PR** #225、#232 |
| hero kicker 對比 2.16:1、learn 重設鈕 112×30（本審計 360px 實測覆核仍在） | **已有 PR** #228（＝FIX-BRIEF A1＋A2） |
| 首頁 LCP 4.4s／總覽 5.4s | **已有 PR** #238 |
| 首頁 fresh-headline chip 壓三卷卡 | **已有 PR** #240 |
| Hero 十二秒開場 wire | **PP O HOLD**：#241（不建議合併）；動畫提案 #226／#235／#236／#237／#239 待 PP O 圈選 |

---

## 3. Top 5 must-do this week（有序）

1. **修 `chron-mobile-table-scroll-trap`（P0，S）**——本審計唯一實測 live 缺陷且無 PR 覆蓋；純 CSS，當日可開可驗（360px：`article.scrollWidth===clientWidth`）。
2. **合 #228（a11y Critical-soft）**——FIX-BRIEF 的兩個 Critical 候選（kicker 2.16:1、learn 鈕 30px 高）全靠它；下一個 site-major 的前置。
3. **更新監測鐘＋陳舊跳線（`bulletin-clock-stale`，P1，S）**——一行資料＋一條測試；「監測」模組的可信度就是更新紀律。
4. **合 #238（LCP，gate must-ship）並核對字體 preconnect 去重是否已含**——FIX-BRIEF §B 明言下次全閘不能再 waive；順手關掉 `fonts-dup-preconnect-blocking`。
5. **定首頁／總覽分工決策（`home-hub-dup-blocks`，P1，M）＋編年頂部 nav 收編（`chron-top-nav-redundant`，P1，S–M）**——前者一個產品叉（首頁撤 vs 總覽撤），定案後半天可落；後者直接強化 GM P0-1 想要的三卷第一眼。

---

## 4. 明確「唔做」清單

- **唔換骨架**：不採「古六＋今三」硬劃（GM 已否；契約 `contract.ts`／`questions.ts`／`patterns.ts` 全綁 `#stage-N`）。
- **唔開新路由**：不加 `/civilization/future/`、不加 PAGES 鍵；卷三維持章門。
- **唔動動畫棧**：不引入 gsap／lenis；監測鐘唔加秒針、唔做恐嚇倒數（站級閘紅線）。任何 hero 動畫推進一律經 PP O（見 `閘風險`）。
- **唔喺本輪搬 future panel**：GM P1「遷卷三 vs 留總覽」未定前，只加摺疊、不搬結構。
- **唔刪長頁**：cosmos／earth／origins／tech／city 全保留；cosmos 薄由 #234 處理。
- **唔做會員系統**：現無會員表面，本審計不建議新增；learn 本機進度已夠。
- **唔碰 #241**：PP O HOLD，不建議合併、不建議拆件吸收。
- **唔物理刪十階錨、唔加第十一階**；`#stage-N` 集合動任何一個都要先過契約測試。
- **唔以桌面截圖充數 TRAP-V08**：真機片屬 FIX-BRIEF §B2 工作流，與本審計無關。
- **唔改 AdSense／新聞 pipeline 業務邏輯**（GM 刻意不做沿用）。

**閘風險提示：** `future-panel-mobile-weight` 若動到 future 結構或字數，需重核厚頁字數閘與 `questions`／`slices` 驗證集；`no-11th-stage-repetition` 動句前必讀 `shared/civilization/SCHEMA.md`（部分句子係契約硬句）。兩項都唔係動畫閘，但係內容契約閘。

---

## 5. 既有開放 PR 的建議合併／排期次序

**A. 閘道先行（細、關下一個 site-major）：**
1. **#228**（a11y：kicker on ink＋learn 44px）——FIX-BRIEF A1＋A2 載體，先合。
2. **#240**（home chip overlap）——獨立小修，隨時。
3. **#238**（LCP）——檔案最多，合後按 FIX-BRIEF §B 重跑 LH≥12 存證 `docs/gates/evidence/`；同場核對 `index.html` 字體 preconnect 去重。

**B. 編年加厚（同檔 `shared/civilization/chronicle.ts`，必須串行）：**
4. **#224**（stages 1–5）→ rebase → 5. **#227**（stages 6–7）→ rebase → 6. **#223**（stages 8–10）。每合一支重跑 `tests/chronicleVolumes.test.ts`；三支齊後做一次古／今字數比例覆核（GM P2 閘的預備）。

**C. 獨立檔、可並行（各自過票後即合）：**
7. **#233**（`future.ts` F1–F6）；8. **#234**（`cosmos.ts`）。與 B 無檔案衝突。

**D. 開蒙線：**
9. **#225** 先、**#232**（taxonomy v2）後；#232 落地前不給 learn 新增站內推廣位（見 `learn-stub-nav-dependency`）。

**E. HOLD／家務：**
- **#241** 維持 HOLD（PP O）；hero-motion 五份 docs（#226／#235／#236／#237／#239）待 PP O 圈選一份再談 wire。
- **#205–#222**（#198 的 R3–R8 投票 docs，#198 已合）：建議家務處理——關閉或歸檔，免遮擋開放列表；不影響碼。

**F. 本審計新工作插入點：** `chron-mobile-table-scroll-trap` 與 A 並行（CSS 不同區塊，預計無衝突；若與 #228 同觸 `src/App.css` 則讓 #228 先合）；`bulletin-clock-stale`、`chron-top-nav-redundant` 在 B 完成後動 `chronicle.ts`／`clock.ts`，避開加厚 PR 的 rebase 鏈；`home-hub-dup-blocks`、`question-index-volume-group` 需產品一句話後排進 B 之後。

---

## 附：實測記錄（2026-10-23，headless Chrome CDP，live）

| 量度 | 360px | 390px |
|---|---|---|
| 全頁 `scrollWidth − clientWidth`（H/C/N/L 四頁） | 0 | 0 |
| 編年 `.civ-article` 容器內橫捲 | **218px** | **188px** |
| 編年 `.civ-table` 寬 | 546px | 546px |
| 軸節點觸控盒（7 個） | 69×55px | 77×55px |
| 編年 chip 觸控盒 | 78×44px | 78×44px |
| learn 重設鈕 | **112×30px** | **112×30px** |
| 軸隱藏寬（可橫捲量） | 243px | 266px |
| 三卷卡（手機直排） | 326×154px | 356×132px |

頁面規模：首頁 ~455 tags／61KB；總覽 ~939 tags（`#future` 約 4,606 漢字＋尾部 civ-article 約 2,703 漢字）；編年 ~1,270 tags／63KB、20 張內容圖（1 eager＋19 lazy）。編年各階漢字（連里程碑塊）：621／563／1074／2292／552／1110／1195／685／622／1445。
