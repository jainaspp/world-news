# Grok 4.7 R1 票 — PR #241

日期：2026-10-23  
檢測席：Grok 4.7  
對象：[#241](https://github.com/jainaspp/world-news/pull/241) `feat(hero): wire Grok #239 twelve-second opening`  
分支：`cursor/wire-grok-hero-opening-8ef7`  
量測 SHA：`428fe73ca9cd53f3119805b8d36c9ec52ef0fa32`  
正典：`docs/gates/SITE-MAJOR-UPDATE-GATE.md`（LOCKED）。本席每一條 P0 計為 Critical。Critical 總數按正典：FAIL 的 P0 有幾條，Critical 就是幾。  
性質：投票紀錄。不改 app、不改 CSS、不合併 #241、不部署。

## 結果

**FAIL. Critical＝1. TRAP-V08＝FAIL.**

這不是上線簽字。另外兩席仍要各自投票。只有 GM 能簽字部署。

## 為什麼整閘是 FAIL

1. **Critical＝1。** `P0-CLIP` 在 H 與 C、360 與 390、淺色與暗色都成立。`.axis-node .lab`／`.yr` 的「城市／今天／未來」（以及對應的「基建／切片／展望」）過了正典 `clipped()`。細節在下面。
2. **`TRAP-V08`＝FAIL。** #198 的延期只限那一次站級重大更新，下一次起失效。#198 已於 2026-10-22 合併。本 PR 是下一次全站閘。目錄裡沒有 iOS Safari 短片，也沒有 Android Chrome 短片。桌面 headless Chrome 不算通過。沒有、也不會放偽造的真機片。見 `TRAP-V08.md`。
3. **§7.3 未齊。** 本席只量了執行卡裡做得到的 H／C、寬 ≤640、淺色與暗色，加上開場透明度與 12 秒 settle。六頁矩陣、414／768／1024／1280／1440、點擊與錨點、Lighthouse、console 面板錄影、抽測頁都未測。未測不得寫成 PASS。

`TRIG-HOME`、`TRIG-ANIM`、`TRIG-TEMPLATE` 都命中。`src/App.css` 的英雄區有 `overflow`、負 margin、opacity，**`TRIG-GLOBAL-CSS` 算在內**。全站閘。不是免閘。

## Critical 的那一條

### `P0-CLIP` — FAIL

正典 §2.4 的 `clipped()`：元素盒子的右邊大於 `innerWidth + 1`，或被 `overflow` 不是 `visible` 的祖先切開，即真。覆蓋要求量 `.axis-node` 的 `.lab`／`.yr`。

H `/`，360×800，暗色，捲動在頂（`wn_hero_seen=1`，開場已 settled）。`.deep-axis` 是內部橫滑：`overflow-x: auto`，`clientWidth` 328，`scrollWidth` 571，可見右緣 x＝344。七個節點盒子：

| 標籤 | lab 左–右 | 相對 360 視口 |
| --- | --- | --- |
| 宇宙 ~138億 | 24–93 | 在可見軌內 |
| 地球 ~40億 | 105–174 | 在可見軌內 |
| 起源 ~300ka | 186–255 | 在可見軌內 |
| 技術 發現 | 267–336 | 在可見軌內，距軌緣約 8px |
| 城市 基建 | 348–417 | `clipped()` |
| 今天 切片 | 429–498 | `clipped()` |
| 未來 展望 | 510–579 | `clipped()` |

同一組三個標籤在 H／C × 360／390 × 淺色／暗色的八張全長裡都出現。390 上「城市」的盒子從 x＝378 起，視口寬 390，只有一窄條進視口，其餘在軌外。

頁面本身沒有橫向捲軸（見 `P0-HSCROLL`）。切開來自軸軌自己的橫滑，不是英雄區把標題裁掉。可見緣沒有把「技術」切成半個字；「城市」的盒子從軌的可見右緣之外才開始。正典的 `clipped()` 沒有「整顆躺在橫滑溢出裡就算過」的例外，`.lab`／`.yr` 又在必量清單裡。本席記 **FAIL**，計 **1** 條 Critical。不另計 `P0-AXIS-NODES`：量到的標籤盒彼此不相交，節點可點盒是 69×55。窄屏六點（這裡實際是七點）橫排要滑才看得到後三點，記在 `P2-AXIS-DENSITY`／`P2-SWIPE-HINT`，不把同一條軌再算成第二條 Critical。

近拍：`2026-10-23-home-360-dark-axis-P0-CLIP.png`、`2026-10-23-civ-360-dark-axis-P0-CLIP.png`。

這條不是 #241 英雄區新畫出來的疊字。軸軌樣式這次 diff 沒有改。全站閘仍然要量它。P0 不能因為「上一閘簽過」而在這次改寫成通過。

## 執行卡（本席量到的）

生產建置 `dist/`（樣式 `index-Fm0TxdTy.css`），用與 Pages Functions 相同的渲染器在 `http://127.0.0.1:4173`。不是 Vite dev。桌面 Chrome headless。方法見 `METHOD.md`。數字見 `measurements-summary.json`。

| # | 項目 | 本席 |
| --- | --- | --- |
| 1 | H、C 全長，寬 ≤640，淺色與暗色 | 有。360 與 390，各兩主題。檔名 `2026-10-23-{home\|civ}-{360\|390}-{light\|dark}-full.png`。不是六頁矩陣。 |
| 2 | 零重疊 | 正典 §2.4 選擇器在這八張的捲動頂部回傳空。開場播放的八個取樣點也是空。父子包含已略過。 |
| 3 | 品牌「文明編年史」 | 這八張通過。見下。 |
| 4 | 無頁面橫向溢出 | 八張都是 `scrollWidth === clientWidth`，`pageOverflow` 為假。 |
| 5 | CI | #241 的兩項 GitHub `check` 在本席查看時為 pass。這不是本投票 PR 的 CI。 |

### 品牌 — 量到的範圍 PASS

360 暗色首頁版頭：`logo-compact-dark.svg`，`naturalWidth` 185×50，`complete`，`aria-label`「文明編年史」，`clipped()` 為假。`<title>` 與 `og:site_name` 都是「文明編年史」。正文沒有掃到「编年史」。開場 kicker 是「文明編年史 · 開場」。特寫：`2026-10-23-home-360-dark-masthead-P0-BRAND.png`。C 的 360 暗色版頭同樣是完整字標圖。

### 開場透明度與 settle — 量到的範圍通過，不是 P0 豁免

390，淺色與暗色，清掉 `wn_hero_seen`，時間用頁內 `__WN_HERO_T0`。`data-hero-boot=1`（不是 4 秒後備把播放截斷）。

| 經過 | mode | phase | chapter | 標題 opacity | 已揭示行 |
| --- | --- | --- | --- | --- | --- |
| ~0.4s | playing | singularity | ancient | 1 | 0 |
| ~0.9s | playing | singularity | ancient | 1 | 1 |
| ~2.7s | playing | bloom | ancient | 1 | 2 |
| ~7.1s | playing | earth | now | 1 | 4 |
| ~10.1s | playing | handoff | future | 1 | 5，監測句已現 |
| ~11.9s | playing | handoff | future | 1 | 6 |
| ~12.7s | settled | handoff | future | 1 | 6 |

標題與 kicker 的 computed opacity 從第一個取樣到 settled 都是 1。390 上英雄區高度在整段播放保持 709。監測句是「監測刻度 · 午夜前 1 分」。播放中的「跳過開場」是 81.2×44。`prefers-reduced-motion: reduce` 在載入後 300ms 已是 `settled`／`handoff`／`future`，六行都在，標題 opacity 1。

三張 `.volume-card` 在英雄區之下（360 暗色：英雄底約 837，第一張卡頂約 1295）。卷名是古、今、未來。

### 觸控 — 列舉的主控通過

360 暗色首頁：版頭圖示、主欄目（文明、編年、今天、開蒙）、`.axis-cta a`（「打開文明總覽」「跳到今日切片」）、`.pattern-axis .chip`、`.case-axis .chip` 的寬和高都 ≥ 44。軸節點連結 69×55。

字標連結 `a.logo-link` 的高是 28（寬大於 44）。正典 `P0-TOUCH-44` 點名的是版頭圖示、欄目晶片、CTA、節點、晶片，沒有把字標連結單獨列進去。本席不把 28px 高的字標另計一條 Critical。圖在版頭特寫裡。

### 骨架 — H 與 C 在這次量測裡在

H：`.axis-hero.axis-slim`、`.axis-cta`、`.chronicle-band` 內三張 `.volume-card`、`.axis-rails`、`.pattern-axis`、`.case-axis`、`#slice`、`.deep-axis`。主按鈕文案「打開文明總覽」「跳到今日切片」。

C：`.axis-title`、`.deep-axis`、`.axis-cta`、`.volume-board` 內三張 `.volume-card`、`.pattern-axis`、`.case-axis`。沒有 `.chronicle-strip`。依 2026-10-22 重鎖，C 缺編年圓點帶不再算 `P0-DOM-EXPECT`。主按鈕文案「閱讀人類起源」「跳到今日切片」。

沒有點擊。`P0-CTA-TARGET` 的「必須點擊」未做，記未測，不記 PASS，也不因未點而加進 Critical。

### 英雄墨色

`.hero-opening` 的 computed background 是 `rgb(22, 28, 36)`，即墨 `#161c24`。

## 未測，所以不能補成 PASS

- N、L、S、A，以及 `TRIG-GLOBAL-CSS` 帶出的抽測頁。
- 414、768、1024、1280、1440，`VP-LAND`。
- 頁中、頁尾、錨點、點 CTA、點節點。
- §7.3 第 6 項的 console 面板截圖或錄影。Settled 八張沒有 `pageerror`。播放取樣有一條 console `Failed to load resource: net::ERR_FAILED`，沒有未捕捉例外，英雄區仍然渲染。這不夠把 `P0-RENDER-ERR` 記成 FAIL，也不夠把它記成 PASS。
- Lighthouse。#198 的 `P1-PERF` 豁免寫明下一次走本閘時，Home 與 Civilization 的 M、4G LCP 改按 P0 覆核（部署名 `site-major-after-198`）。本席沒有重跑。這兩列記未測，不計入 Critical＝1，也不能當成已壓到 2.5s。
- `P1-STICKY-XBROWSER` 要真機。沒有短片，記未測。不另造一條「黏性層壞了」的 FAIL。真機缺口全部算在 `TRAP-V08`＝FAIL。

## 票

| 席 | 對象 | 票 |
| --- | --- | --- |
| Grok 4.7 | #241 @ `428fe73` | **FAIL。Critical＝1。TRAP-V08＝FAIL。** |

Critical 的那一條是 `P0-CLIP`。`TRAP-V08` 不是 P0 編號，不併進 Critical 總數，單獨記 FAIL。未測的格子沒有拿來灌 Critical。
