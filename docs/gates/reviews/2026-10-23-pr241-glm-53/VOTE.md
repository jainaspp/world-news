# GLM 5.3 R1 — PR #241

- 席：GLM 5.3
- 輪次：R1
- 日期：2026-10-23
- 對象：[#241](https://github.com/jainaspp/world-news/pull/241) `feat(hero): wire Grok #239 twelve-second opening`
- Head：`428fe73ca9cd53f3119805b8d36c9ec52ef0fa32`（`cursor/wire-grok-hero-opening-8ef7`）
- 狀態：未合併、未部署。本文件不合併 #241、不部署、不改產品碼。

## 裁決

- **Verdict: FAIL**
- **Critical: 1**
- **TRAP-V08: FAIL**

Critical 的那一條是 `P0-TOUCH-44`。`TRAP-V08` 不是 P0，不另計入 Critical；它單獨已經使本閘不得 PASS。#198 的 DEFER 到這一次站級重大更新失效，缺片記 **FAIL**，不記 DEFERRED，也不記 PASS。

綁定文件是鎖定的 `SITE-MAJOR-UPDATE-GATE`。GLM 清單 `docs/gates/SITE-REVIEW-CHECKLIST-GLM-53-2026-10-20.md` 只作席位輸入，不單獨當上線閘。

## 觸發

全站閘。§1.3 豁免不適用。

| ID | 為什麼算上 |
| --- | --- |
| `TRIG-HOME` | 首頁 `/` 首屏開場改寫 |
| `TRIG-ANIM` | 十二秒時間軸、`prefers-reduced-motion`、canvas |
| `TRIG-TEMPLATE` | `shared/heroOpening.ts` 的 SSR 開場樹 |
| `TRIG-GLOBAL-CSS` | `src/App.css` 開場段有改（負 margin、`84svh`、`overflow`、hint 間距）。檔案在觸發表上，順手改 CSS 不得免閘 |

產品 PR 的 CI `check` 兩條都綠（actions `39904776830`、`39904800128`）。CI 綠不是視覺閘。

## 量測範圍

桌面 Chrome（headless）打開本 head 的 production `dist/`，首頁走 `injectHomeShell`，總覽走 `renderCivilizationHub`。`/api/news` 回空清單，所以首頁全長是空 feed 的整頁，不是生產 RSS 的長度。執行卡要的軸、主 CTA、三張 `.volume-card`、模式軌、案例軌都在這份 DOM 裡。

這不是 iOS Safari，也不是 Android Chrome。沒有真機或雲端真機短片。桌面裝置模式不算 `TRAP-V08`。

| 格 | 視口 | 主題 | 全長圖高（與 `scrollHeight` 一致） |
| --- | --- | --- | --- |
| H `/` | 360×800 | 淺、暗 | 5969 |
| H `/` | 390×844 | 淺、暗 | 5896 |
| C `/civilization/` | 360×800 | 淺、暗 | 27680 |
| C `/civilization/` | 390×844 | 淺、暗 | 27082 |

圖在 `shots/`。原始幾何在 `measurements.json`。

未測、因此整閘不能 PASS（§7.1.5、§7.3）：414、768、1024、1280、1440；`N` `L` `S` `A`；頁中／頁尾／錨點點擊；`VP-LAND`；Lighthouse；第 7.3 節其餘同框。未測不是 PASS，也不把那些 P0 算進 Critical。

## TRAP-V08 = FAIL

正典文首 LOCK：`TRAP-V08` 與 §7.3 第 8 項只延後 [#198](https://github.com/jainaspp/world-news/pull/198)。「下一次站級重大更新起本延期失效。」#241 就是下一次。

#241 沒有 iOS Safari 短片，也沒有 Android Chrome 短片，滑完 H `/` 與 C `/civilization/`。本席沒有補拍，也沒有把桌面模擬寫成通過。

## Critical：`P0-TOUCH-44`

靜止幀，H，360 與 390，淺色與暗色，四格相同。

開場兩顆主連結的盒子高都是 44。其下「向下滾動，開始編年」（`.hero-hint`）的盒子也是 44。按鈕底緣到 hint 頂緣是 **4px**，小於 8px。中心距 72.5 與 84.5，中心距那一條沒有破。

360 淺色、字體已載入後的盒子：

| 控制 | top | bottom | left | right | 寬 × 高 |
| --- | --- | --- | --- | --- | --- |
| 開始編年 | 733 | 777 | 61.1 | 159.8 | 98.8 × 44 |
| 進入今日切片 | 733 | 777 | 169.8 | 298.9 | 129.1 × 44 |
| 向下滾動，開始編年 | 781 | 825 | 91.5 | 268.5 | 176.9 × 44 |

兩顆按鈕彼此的水平間距是 10px，沒有破 8px。破的是按鈕與 hint。對應 CSS 是這次 diff 把 `.hero-hint-row` 的 `margin` 從 `22px 0 0` 改成 `4px 0 0`。

同一輪裡，點名的主控盒子（版頭圖示、主欄目、`.axis-cta a`、`.axis-node`、模式／案例晶片、播放中的「跳過開場」）沒有寬或高 < 44。跳過開場在 `data-mode=playing` 時是 **81.2 × 44**。

總覽軸上「跳到今日切片」與「起源」在進場動畫中段曾量到 4–6.8px。動畫停住之後（以及 `prefers-reduced-motion: reduce`）節點 `transform` 回到單位矩陣，節點底 406、CTA 頂 428，間距 **22px**。兩顆軸 CTA 彼此是 **8px**，門檻是 `< 8`，不算 FAIL。這兩筆不計入 Critical。

## 執行卡上量過而且沒有 FAIL 的格

只覆蓋上表八格（外加首頁減動態四格）。不是全覆蓋面的 PASS。

| 項 | 八格結果 |
| --- | --- |
| 全長 | 圖高等於 `scrollHeight`，不是首屏裁切 |
| 零重疊 | §2.4 選擇器腳本回傳空。開場標題、kicker、各行在播放早期與 settled 也沒有 >1px 的兄弟相交 |
| 品牌 | 可見字標是 `logo-compact`，`naturalWidth` 185，`aria-label`「文明編年史」，`clipped()` 為假。內文沒有「编年史」。`<title>` 與 `og:site_name` 含完整五字 |
| 無橫向溢出 | `scrollWidth === clientWidth === innerWidth`。`pageOverflow` 為假 |
| DOM | H：瘦軸、`.axis-cta`（打開文明總覽／跳到今日切片）、`.chronicle-band` 內三張 `.volume-card`（古／今／未來）、`.axis-rails`、模式軌、案例軌、`#slice`。C：`.axis-title`、`.deep-axis`、`.axis-cta`（閱讀人類起源／跳到今日切片）、三張 `.volume-card`、`.pattern-axis`、`.case-axis` |
| 裁字 | settled 可見的標題、導語、CTA、主欄目、三卷名、字標，`clipped()` 沒有命中 |
| console | 這十二次載入沒有 `pageerror` |
| 開場標題不透明 | 播放中 157–322ms：`opacity` 1，`transform: none`，`data-mode=playing`，`data-phase=singularity`，`data-hero-boot=1`。settled 仍是 1 |
| 十二秒落定 | 12238–12274ms 進入 `settled` / `handoff` / `future`，六行都 `data-on=true`，讀數「監測刻度 · 午夜前 1 分」 |
| 減動態 | 306–307ms 已經 `settled` / `handoff` / `future`，六行在，標題 `opacity` 1、`transform: none`。這只覆蓋開場，不把全站 `P1-MOTION` 記成 PASS |

標題與 kicker 的實像素：字色像素就是計算色 `#f7f1e6` 與 `#c4a572`，底是墨 `#161c24`（`rgb(22,28,36)`）。對比約 15.24 與 7.32，都過 4.5:1／3:1。百分位取樣會把稀疏筆畫的抗鋸齒當成前景，那個讀數不用。

## 未測（擋 PASS，不計 Critical）

§7.3 的其餘截圖、點擊、`TRAP-V02` 以外的陷阱、Lighthouse（`P1-PERF`／`P1-CLS`）、`N`／`L`／`A`、橫向、安全區。`P1` 沒有新的豁免請求；未測的 P1 也不能當成已處理。

## 本席不做的事

不改 `src/`、`shared/`、`functions/`。不合併 #241。不部署。不製作真機短片。
