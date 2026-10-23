# Kimi K3 R1 票 — PR #241

**FAIL. Critical＝3. TRAP-V08＝FAIL.**

- 席：Kimi K3
- 投票對象：正典 `docs/gates/SITE-MAJOR-UPDATE-GATE.md`（`SITE-MAJOR-UPDATE-GATE`）。清單輸入是正典點名的 `docs/gates/SITE-REVIEW-CHECKLIST-KIMI-K3-2026-10-20.md`。較嚴口徑用正典（重疊 >1px、觸控 44／中心距 44／邊緣 8、3/3、P0 不可豁免）。本席清單不單獨放行。
- 產品 PR：[#241](https://github.com/jainaspp/world-news/pull/241) `feat(hero): wire Grok #239 twelve-second opening`
- 分支：`cursor/wire-grok-hero-opening-8ef7`
- 量測 SHA：`428fe73ca9cd53f3119805b8d36c9ec52ef0fa32`
- 設計來源：#239。本票不合併 #241，不部署。
- 渲染：PR head 的 production `dist/`，`injectHomeShell` / `renderCivilizationHub`，`http://127.0.0.1:4173`。不是 Vite dev。桌面 Chrome 156 headless。不是真機，不是雲端真機。
- 觸發：全站閘。`TRIG-HOME`、`TRIG-ANIM`、`TRIG-TEMPLATE`。`src/App.css` 只改英雄區，正典仍把該檔的改動算 `TRIG-GLOBAL-CSS`。不免閘。
- CI：#241 的 `check` 為 SUCCESS。CI 綠不代替本閘。

## TRAP-V08

**FAIL。不是 DEFERRED，不是 PASS。**

文首 LOCK 2026-10-22 晚把缺片記 DEFERRED，範圍只限 #198，並寫明下一次站級重大更新起延期失效。#241 是下一次走本閘的站級重大更新。本目錄沒有 iOS Safari 短片，也沒有 Android Chrome 短片。桌面 Chrome／DevTools 裝置模式不能通過 `TRAP-V08`。沒有、也不放偽造短片。

## Critical

**3。** 只計實測、且按正典或 §7.2 升為 P0 的 FAIL。未測不計入 Critical，但 §7.1 第 5 項與 §7.3 缺件仍使整閘不得 PASS。P0 不可由本票改寫成 P1，也不可把 #198 已到期的豁免再用一次。

### P0-TOUCH-44 — FAIL

英雄區在 settled 與 `prefers-reduced-motion: reduce` 下，兩顆主按鈕與提示連結都是可點盒，高 44，彼此邊緣間距 **4px**（門檻 8px）。

覆核座標（H，360×800，暗色，`getBoundingClientRect`）：

| 控制 | 高 | top | bottom |
| --- | --- | --- | --- |
| `a.hero-btn-brass`「開始編年」 | 44 | 125 | 169 |
| `a.hero-btn-ghost`「進入今日切片」 | 44 | 125 | 169 |
| `a.hero-hint`「向下滾動，開始編年」 | 44 | 173 | 217 |

「開始編年」底邊 169，提示頂邊 173，邊緣 4。兩顆按鈕橫向邊緣 10（≥8）。同一 4px 出現在 H 的 360／390／414 × 淺色與暗色全長，以及 360 減動態、390 十二秒 settle。CSS 是 `.hero-hint-row { margin: 4px 0 0; }`。

近拍：`shots/2026-10-23-home-390-light-cta-gap.png`、`shots/2026-10-23-home-360-dark-cta-gap.png`。

### 已豁免的 `P1-PERF` 兩列 — 這次按 P0，FAIL

`docs/gates/reviews/2026-10-22-pr198-GM-P1-PERF-WAIVE.md` 豁免 Home 與 Civilization 的 M 4G LCP，並寫明下一次走本閘時改按 P0 覆核。#241 就是那一次。兩列仍高於 2.5s。本票不能再豁免。

Lighthouse 12.8.2，simulated 4G，行動模擬，`http://127.0.0.1:4173`，2026-10-23。CLS 不在這兩列裡：Home 0，Civilization 0.015，都 ≤ 0.1。

| 頁 | LCP | 元素 | 結果 |
| --- | --- | --- | --- |
| H `/` | **4351 ms**（4.4s） | `h2.hero-title`「從宇宙到今天」。Render Delay 3901 ms，佔 90% | FAIL。檔 `lighthouse-home-mobile.json` |
| C `/civilization/` | **5702 ms**（5.7s） | `div.axis-vignette`。Render Delay 4542 ms，佔 80% | FAIL。檔 `lighthouse-civ-mobile.json` |

桌面快載下標題 computed opacity 是 1，像素抽樣看得到字。模擬 4G 的 LCP 仍然是這顆標題，而且審計裡的 bounding rect 是 0。兩件事同時成立：快載不透明，節流後的 LCP 仍超過 2.5s。門檻用後者。

不另開一條的觀察：`a.logo-link` 高 28。正典點名的版頭圖示（搜尋、重新整理、主題、收藏、關注、語言）在 360 暗色都是 44×44。字標不在該圖示清單裡，這次不計第二條 P0。

### 軸軌裁字 — 不開 P0-CLIP

`.deep-axis` 在 ≤640 是 `overflow-x: auto`。360 暗色：clientWidth 328，scrollWidth 571。靜止時軌內整顆可見的是「宇宙」「地球」「起源」「技術」。技術標籤右緣在軌右緣內 8px。 「城市」「今天」「未來」整顆在軌外，不是停住時被切成半個字。正典允許內部橫滑，並以半個字為失敗。本席不把軌外下一顆記成 `P0-CLIP`。下一顆沒有露出 8px，記 **P2-SWIPE-HINT**，不擋、不計 Critical。近拍：`shots/2026-10-23-home-360-dark-axis-el.png`。

## 本席量過的項

量測面是使用者點名的下限，加上能在同一預覽裡做完的點擊。不是 §7.3 全包。

| 項目 | 結果 |
| --- | --- |
| H、C × 360／390／414 × 淺色與暗色全長 | 12 張在 `shots/`。檔名含日期、頁、寬、主題 |
| `TRAP-V02` 正典選擇器（另加 `.hero-title`、`.hero-kicker`、`.hero-cta`、`.hero-skip`、`.hero-replay`） | 上述幀 `hit` 為空。允許例外用不上 |
| 品牌「文明編年史」 | H 的 `<title>`／og:site_name／kicker 含完整五字。C 的 `<title>` 是「人類文明 — 文明編年史」，og:site_name 是「文明編年史」。字標圖未破、`clipped()` 為假。抽樣 HTML 沒有「编年史」 |
| 頁面橫向滾動 | 12 張全長都是 `scrollWidth === clientWidth === innerWidth`。`pageOverflow` 為假 |
| 英雄標題 opacity | playing（約 0.4s，phase `singularity`）、playing（約 2.8s，phase `bloom`）、reduced 300ms、十二秒後 settle，computed opacity 都是 **1**。標題色 `#f7f1e6` 量級。像素對比：播放幀約 15:1；十二秒 settle 抽樣約 6.5:1，仍 ≥ 4.5 |
| 減動態 | `prefers-reduced-motion: reduce`，未寫 `wn_hero_seen`，300ms 已是 `data-mode=settled`、`data-phase=handoff`、`data-chapter=future`，六行與監測句 opacity 1 |
| 十二秒 settle | 390 淺色，約 12.5s：`settled` / `handoff` / `future`，六行與「監測刻度 · 午夜前 1 分」都在 |
| 跳過 | 播放中「跳過開場」81.2×44。settle 後改為「重播開場」，同為高 44 |
| `P0-DOM-EXPECT` | H 有軸、`.axis-cta`、`.chronicle-band`、三張 `.volume-card`、`.axis-rails`、`.pattern-axis`、`.case-axis`、`#slice`。C 有 `.axis-title`、`.deep-axis`、`.axis-cta`、三張 `.volume-card`、`.pattern-axis`、`.case-axis`。C 沒有 `.chronicle-strip`，依 2026-10-22 重鎖不計 FAIL |
| `P0-CTA-TARGET` | H「打開文明總覽」進入 `/civilization/`。H「跳到今日切片」進入 `/#slice`，標題在貼頂列下緣之下 **30.9px**（≥8）。C「閱讀人類起源」整句可見，進入 `/civilization/origins/` |
| `P0-RENDER-ERR` | 沒有 `pageerror`。兩次 console 是 `Failed to load resource`（攔截廣告／字體請求），沒有未捕捉 exception，區塊有渲染 |
| 版頭圖示 | 搜尋、重新整理、主題、收藏、關注、語言：44×44 |

原始列：`measurements.json`。

## 未測（缺了就不得 PASS）

- `TRAP-V08` 兩支真機短片。見上。FAIL。
- §7.3 第 1–2 項的其餘頁：N、L、A、768／1024／1280／1440、橫向 `VP-LAND`、頁中、頁尾。本席沒有這些圖，不把未測寫成 PASS。
- `TRAP-V02` 的第二輪「全部按鈕、連結、輸入、文字節點」沒有另存一份零碰撞報告。正典選擇器那一輪是空的。
- `P1-PERF` 的其餘面：新聞頁 A 的 Lighthouse 沒有跑。#198 也沒有豁免它。本席不把沒跑的 A 編成數字。Home 與 Civilization 兩列已量，見上，計入 Critical。
- 斜向滑、真機 sticky、安全區實機。桌面模擬不能補 `TRAP-V08`，也不能補 `P1-STICKY-XBROWSER`。

## 結論

任一席 FAIL 即整閘 FAIL。本席 **FAIL**。Critical＝**3**（`P0-TOUCH-44`，加上 §7.2 升為 P0 的 Home LCP、Civilization LCP）。`TRAP-V08`＝**FAIL**。沒有合併，沒有部署，沒有呼叫付費 xAI API。
