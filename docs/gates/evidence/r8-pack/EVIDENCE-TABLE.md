# PR #198 R8 證據表（§7.3 第 9 項）

日期：2026-10-22
分支：`cursor/chronicle-three-volumes-p0-d5bd`
對象：[#198](https://github.com/jainaspp/world-news/pull/198)
量測：`npm run build` 的 `dist/`，渲染器同 Pages Functions（`injectHomeShell`、`renderCivilizationHub`、`renderChroniclePage`、`renderLearnPath`、`renderStoryPage`），`http://127.0.0.1:4173`。不是 Vite dev。
首頁 feed：`loadFeeds()` 前 16 則（當次 772 則入庫，feed 錯誤 3）。
頁 A 最長標題：「‘Ali G: Who Iz I?’ Review…」（162 字，`/story/91e9bae258cd/`）。一般稿：「Briton Slater, 18, to make practice debut in Mexico」（51 字，`/story/ab92e28904df/`）。
截圖：樣式表裡既有的 `body.static` 凍結，並提早掛上 Noto。Lighthouse 冷啟動不凍結、不提早掛字。英雄在截圖前以 `sessionStorage.wn_hero_seen` 停在揭曉後，避免整頁透明。
檢測席是量測者，不是三席投票。未 merge，未 deploy。沒有產品 CSS／UI 改動。

## §7.3 清單

| # | 項 | 結果 |
| --- | --- | --- |
| 1 | 六頁 × 淺暗 × 360／390／768／1280／1440；H／C 另加 414、1024；H／C 頁中、頁尾、錨點直達（M／T／D，淺暗） | 齊。見下方「全長與狀態」 |
| 2 | 事故同框與點擊 | 齊。`sameframe`、`click-slice`、編年模式卡、開蒙、新聞兩篇、768、1280／1440 淺色、字標、`land` |
| 3 | 每條 P0 至少一張 ≤640，加 `scrollWidth` | 齊。檔名含 `P0-*`。選擇器見 `SCROLLWIDTH.md` |
| 4 | `TRAP-V02` | 正典腳本在靜止首屏為零碰撞。例外只寫在 `TRAP-V02.md` |
| 5 | 間距 &lt; 8px | 結構選擇器沒有 0–8px 的鄰接對。輪廓圖 `2026-10-22-civ-360-light-gaps-outline.png` |
| 6 | console 無阻斷錯誤 | PASS。0 個 uncaught。`2026-10-22-home-640-light-console-P0-RENDER-ERR.png` |
| 7 | Lighthouse 行動端 LCP／INP／CLS | 已拍。LCP 過 2.5s，見豁免文件。CLS 過。INP 審計不存在，實驗室點擊 &lt; 200ms |
| 8 | 真機短片 | **DEFERRED**。`TRAP-V08-DEFERRED.md` → `docs/gates/reviews/2026-10-22-pr198-GM-TRAP-V08-DEFER.md` |
| 9 | 本表 | 本文件 |

## Lighthouse（P1-PERF／P1-CLS）

| ID | 頁 | 視口 | 主題 | 結果 | 檔名 | 檢測席 |
| --- | --- | --- | --- | --- | --- | --- |
| P1-PERF | home | 412×823 M simulated 4G | light | FAIL | `2026-10-22-home-412-light-lighthouse-P1-PERF.png` | Grok 4.7（R8 證據，非投票） |
| P1-CLS | home | 412×823 M simulated 4G | light | PASS | `2026-10-22-home-412-light-lighthouse-P1-PERF.png` | Grok 4.7（R8 證據，非投票） |
| P1-PERF | civ | 412×823 M simulated 4G | light | FAIL | `2026-10-22-civ-412-light-lighthouse-P1-PERF.png` | Grok 4.7（R8 證據，非投票） |
| P1-CLS | civ | 412×823 M simulated 4G | light | PASS | `2026-10-22-civ-412-light-lighthouse-P1-PERF.png` | Grok 4.7（R8 證據，非投票） |

LCP：Home **4.4 s**（`h2.hero-title`），Civilization **5.4 s**（`div.axis-vignette`）。CLS：Home **0**，Civilization **0.015**。INP：導航報告無此審計。實驗室點擊見 `lab-interaction.json`（Home `.search-toggle` 24ms，Civilization `.theme-toggle` 88ms）。兩條 LCP 的豁免在 `docs/gates/reviews/2026-10-22-pr198-GM-P1-PERF-WAIVE.md`。原始報告：`lighthouse-home-mobile.report.html`／`.json`、`lighthouse-civ-mobile.report.html`／`.json`。

## 錨點間距

直接打開錨點後，標題頂與貼頂列底的間距。門檻 8px。

| 檔名 | 錨 | 間距 px | 結果 |
| --- | --- | --- | --- |
| `2026-10-22-home-360-light-anchor.png` | slice | 31.4 | PASS |
| `2026-10-22-home-768-light-anchor.png` | slice | 32.6 | PASS |
| `2026-10-22-home-1280-light-anchor.png` | slice | 33.3 | PASS |
| `2026-10-22-home-360-dark-anchor.png` | slice | 31.4 | PASS |
| `2026-10-22-home-768-dark-anchor.png` | slice | 32.6 | PASS |
| `2026-10-22-home-1280-dark-anchor.png` | slice | 33.3 | PASS |
| `2026-10-22-civ-360-light-anchor.png` | future | 37.1 | PASS |
| `2026-10-22-civ-768-light-anchor.png` | future | 37.2 | PASS |
| `2026-10-22-civ-1280-light-anchor.png` | future | 36.6 | PASS |
| `2026-10-22-civ-360-dark-anchor.png` | future | 37.1 | PASS |
| `2026-10-22-civ-768-dark-anchor.png` | future | 37.2 | PASS |
| `2026-10-22-civ-1280-dark-anchor.png` | future | 36.6 | PASS |
| `2026-10-22-civ-360-dark-click-slice-P0-CTA-COVER.png` | /#slice | 31.4 | PASS |

從總覽點「跳到今日切片」落到 `/#slice`，標題「今日切片」，間距 **31.4px**。檔：`2026-10-22-civ-360-dark-click-slice-P0-CTA-COVER.png`。

## 全長、狀態、近拍

結果：頁面 `scrollWidth` 沒有大於 `clientWidth + 1`，且正典碰撞腳本沒有落在靜止首屏的非例外相交，記 PASS。S 在 360／390 的 `.chrome` × `.case-axis` 寫在備註，說明見 `TRAP-V02.md`。

| ID | 頁 | 視口 | 主題 | 結果 | 檔名 | 檢測席 | 備註 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| §7.3.1 | home | 360 (360×800) | light | PASS | `2026-10-22-home-360-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 390 (390×844) | light | PASS | `2026-10-22-home-390-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 768 (768×1024) | light | PASS | `2026-10-22-home-768-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 1280 (1280×800) | light | PASS | `2026-10-22-home-1280-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 1440 (1440×900) | light | PASS | `2026-10-22-home-1440-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 414 (414×896) | light | PASS | `2026-10-22-home-414-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 1024 (1024×1366) | light | PASS | `2026-10-22-home-1024-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 360 (360×800) | dark | PASS | `2026-10-22-home-360-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 390 (390×844) | dark | PASS | `2026-10-22-home-390-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 768 (768×1024) | dark | PASS | `2026-10-22-home-768-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 1280 (1280×800) | dark | PASS | `2026-10-22-home-1280-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 1440 (1440×900) | dark | PASS | `2026-10-22-home-1440-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 414 (414×896) | dark | PASS | `2026-10-22-home-414-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 1024 (1024×1366) | dark | PASS | `2026-10-22-home-1024-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 360 (360×800) | light | PASS | `2026-10-22-civ-360-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 390 (390×844) | light | PASS | `2026-10-22-civ-390-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 768 (768×1024) | light | PASS | `2026-10-22-civ-768-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 1280 (1280×800) | light | PASS | `2026-10-22-civ-1280-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 1440 (1440×900) | light | PASS | `2026-10-22-civ-1440-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 414 (414×896) | light | PASS | `2026-10-22-civ-414-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 1024 (1024×1366) | light | PASS | `2026-10-22-civ-1024-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 360 (360×800) | dark | PASS | `2026-10-22-civ-360-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 390 (390×844) | dark | PASS | `2026-10-22-civ-390-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 768 (768×1024) | dark | PASS | `2026-10-22-civ-768-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 1280 (1280×800) | dark | PASS | `2026-10-22-civ-1280-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 1440 (1440×900) | dark | PASS | `2026-10-22-civ-1440-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 414 (414×896) | dark | PASS | `2026-10-22-civ-414-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 1024 (1024×1366) | dark | PASS | `2026-10-22-civ-1024-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | chronicle | 360 (360×800) | light | PASS | `2026-10-22-chronicle-360-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | chronicle | 390 (390×844) | light | PASS | `2026-10-22-chronicle-390-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | chronicle | 768 (768×1024) | light | PASS | `2026-10-22-chronicle-768-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | chronicle | 1280 (1280×800) | light | PASS | `2026-10-22-chronicle-1280-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | chronicle | 1440 (1440×900) | light | PASS | `2026-10-22-chronicle-1440-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | chronicle | 360 (360×800) | dark | PASS | `2026-10-22-chronicle-360-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | chronicle | 390 (390×844) | dark | PASS | `2026-10-22-chronicle-390-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | chronicle | 768 (768×1024) | dark | PASS | `2026-10-22-chronicle-768-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | chronicle | 1280 (1280×800) | dark | PASS | `2026-10-22-chronicle-1280-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | chronicle | 1440 (1440×900) | dark | PASS | `2026-10-22-chronicle-1440-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | learn | 360 (360×800) | light | PASS | `2026-10-22-learn-360-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | learn | 390 (390×844) | light | PASS | `2026-10-22-learn-390-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | learn | 768 (768×1024) | light | PASS | `2026-10-22-learn-768-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | learn | 1280 (1280×800) | light | PASS | `2026-10-22-learn-1280-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | learn | 1440 (1440×900) | light | PASS | `2026-10-22-learn-1440-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | learn | 360 (360×800) | dark | PASS | `2026-10-22-learn-360-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | learn | 390 (390×844) | dark | PASS | `2026-10-22-learn-390-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | learn | 768 (768×1024) | dark | PASS | `2026-10-22-learn-768-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | learn | 1280 (1280×800) | dark | PASS | `2026-10-22-learn-1280-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | learn | 1440 (1440×900) | dark | PASS | `2026-10-22-learn-1440-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | slice | 360 (360×800) | light | PASS | `2026-10-22-slice-360-light-full.png` | Grok 4.7（R8 證據，非投票） | 貼頂列蓋住已捲走的案例軌尾；錨點標題間距見 anchor 列 |
| §7.3.1 | slice | 390 (390×844) | light | PASS | `2026-10-22-slice-390-light-full.png` | Grok 4.7（R8 證據，非投票） | 貼頂列蓋住已捲走的案例軌尾；錨點標題間距見 anchor 列 |
| §7.3.1 | slice | 768 (768×1024) | light | PASS | `2026-10-22-slice-768-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | slice | 1280 (1280×800) | light | PASS | `2026-10-22-slice-1280-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | slice | 1440 (1440×900) | light | PASS | `2026-10-22-slice-1440-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | slice | 360 (360×800) | dark | PASS | `2026-10-22-slice-360-dark-full.png` | Grok 4.7（R8 證據，非投票） | 貼頂列蓋住已捲走的案例軌尾；錨點標題間距見 anchor 列 |
| §7.3.1 | slice | 390 (390×844) | dark | PASS | `2026-10-22-slice-390-dark-full.png` | Grok 4.7（R8 證據，非投票） | 貼頂列蓋住已捲走的案例軌尾；錨點標題間距見 anchor 列 |
| §7.3.1 | slice | 768 (768×1024) | dark | PASS | `2026-10-22-slice-768-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | slice | 1280 (1280×800) | dark | PASS | `2026-10-22-slice-1280-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | slice | 1440 (1440×900) | dark | PASS | `2026-10-22-slice-1440-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | news | 360 (360×800) | light | PASS | `2026-10-22-news-360-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | news | 390 (390×844) | light | PASS | `2026-10-22-news-390-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | news | 768 (768×1024) | light | PASS | `2026-10-22-news-768-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | news | 1280 (1280×800) | light | PASS | `2026-10-22-news-1280-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | news | 1440 (1440×900) | light | PASS | `2026-10-22-news-1440-light-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | news | 360 (360×800) | dark | PASS | `2026-10-22-news-360-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | news | 390 (390×844) | dark | PASS | `2026-10-22-news-390-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | news | 768 (768×1024) | dark | PASS | `2026-10-22-news-768-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | news | 1280 (1280×800) | dark | PASS | `2026-10-22-news-1280-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | news | 1440 (1440×900) | dark | PASS | `2026-10-22-news-1440-dark-full.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 360 (360×800) | light | PASS | `2026-10-22-home-360-light-mid.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 360 (360×800) | light | PASS | `2026-10-22-home-360-light-end.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 360 (360×800) | light | PASS | `2026-10-22-home-360-light-anchor.png` | Grok 4.7（R8 證據，非投票） | 貼頂列蓋住已捲走的案例軌尾；錨點標題間距見 anchor 列 |
| §7.3.1 | home | 768 (768×1024) | light | PASS | `2026-10-22-home-768-light-mid.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 768 (768×1024) | light | PASS | `2026-10-22-home-768-light-end.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 768 (768×1024) | light | PASS | `2026-10-22-home-768-light-anchor.png` | Grok 4.7（R8 證據，非投票） | 錨點間距 32.6px |
| §7.3.1 | home | 1280 (1280×800) | light | PASS | `2026-10-22-home-1280-light-mid.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 1280 (1280×800) | light | PASS | `2026-10-22-home-1280-light-end.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 1280 (1280×800) | light | PASS | `2026-10-22-home-1280-light-anchor.png` | Grok 4.7（R8 證據，非投票） | 錨點間距 33.3px |
| §7.3.1 | home | 360 (360×800) | dark | PASS | `2026-10-22-home-360-dark-mid.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 360 (360×800) | dark | PASS | `2026-10-22-home-360-dark-end.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 360 (360×800) | dark | PASS | `2026-10-22-home-360-dark-anchor.png` | Grok 4.7（R8 證據，非投票） | 貼頂列蓋住已捲走的案例軌尾；錨點標題間距見 anchor 列 |
| §7.3.1 | home | 768 (768×1024) | dark | PASS | `2026-10-22-home-768-dark-mid.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 768 (768×1024) | dark | PASS | `2026-10-22-home-768-dark-end.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 768 (768×1024) | dark | PASS | `2026-10-22-home-768-dark-anchor.png` | Grok 4.7（R8 證據，非投票） | 錨點間距 32.6px |
| §7.3.1 | home | 1280 (1280×800) | dark | PASS | `2026-10-22-home-1280-dark-mid.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 1280 (1280×800) | dark | PASS | `2026-10-22-home-1280-dark-end.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | home | 1280 (1280×800) | dark | PASS | `2026-10-22-home-1280-dark-anchor.png` | Grok 4.7（R8 證據，非投票） | 錨點間距 33.3px |
| §7.3.1 | civ | 360 (360×800) | light | PASS | `2026-10-22-civ-360-light-mid.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 360 (360×800) | light | PASS | `2026-10-22-civ-360-light-end.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 360 (360×800) | light | PASS | `2026-10-22-civ-360-light-anchor.png` | Grok 4.7（R8 證據，非投票） | 錨點間距 37.1px |
| §7.3.1 | civ | 768 (768×1024) | light | PASS | `2026-10-22-civ-768-light-mid.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 768 (768×1024) | light | PASS | `2026-10-22-civ-768-light-end.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 768 (768×1024) | light | PASS | `2026-10-22-civ-768-light-anchor.png` | Grok 4.7（R8 證據，非投票） | 錨點間距 37.2px |
| §7.3.1 | civ | 1280 (1280×800) | light | PASS | `2026-10-22-civ-1280-light-mid.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 1280 (1280×800) | light | PASS | `2026-10-22-civ-1280-light-end.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 1280 (1280×800) | light | PASS | `2026-10-22-civ-1280-light-anchor.png` | Grok 4.7（R8 證據，非投票） | 錨點間距 36.6px |
| §7.3.1 | civ | 360 (360×800) | dark | PASS | `2026-10-22-civ-360-dark-mid.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 360 (360×800) | dark | PASS | `2026-10-22-civ-360-dark-end.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 360 (360×800) | dark | PASS | `2026-10-22-civ-360-dark-anchor.png` | Grok 4.7（R8 證據，非投票） | 錨點間距 37.1px |
| §7.3.1 | civ | 768 (768×1024) | dark | PASS | `2026-10-22-civ-768-dark-mid.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 768 (768×1024) | dark | PASS | `2026-10-22-civ-768-dark-end.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 768 (768×1024) | dark | PASS | `2026-10-22-civ-768-dark-anchor.png` | Grok 4.7（R8 證據，非投票） | 錨點間距 37.2px |
| §7.3.1 | civ | 1280 (1280×800) | dark | PASS | `2026-10-22-civ-1280-dark-mid.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 1280 (1280×800) | dark | PASS | `2026-10-22-civ-1280-dark-end.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.1 | civ | 1280 (1280×800) | dark | PASS | `2026-10-22-civ-1280-dark-anchor.png` | Grok 4.7（R8 證據，非投票） | 錨點間距 36.6px |
| §7.3.2 | civ | 360 (360×800) | light | FAIL | `2026-10-22-civ-360-light-sameframe.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | home | 360 (360×800) | light | FAIL | `2026-10-22-home-360-light-sameframe.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | civ | 390 (390×844) | light | FAIL | `2026-10-22-civ-390-light-sameframe.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | home | 390 (390×844) | light | FAIL | `2026-10-22-home-390-light-sameframe.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | civ | 360 (360×800) | dark | FAIL | `2026-10-22-civ-360-dark-sameframe.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | home | 360 (360×800) | dark | FAIL | `2026-10-22-home-360-dark-sameframe.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | civ | 390 (390×844) | dark | FAIL | `2026-10-22-civ-390-dark-sameframe.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | home | 390 (390×844) | dark | FAIL | `2026-10-22-home-390-dark-sameframe.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-CTA-COVER | civ | 360 (360×800) | dark | PASS | `2026-10-22-civ-360-dark-click-slice-P0-CTA-COVER.png` | Grok 4.7（R8 證據，非投票） | 貼頂列蓋住已捲走的案例軌尾；錨點標題間距見 anchor 列 |
| P0-CHRONICLE-PAGE | chronicle | 360 (360×800) | dark | PASS | `2026-10-22-chronicle-360-dark-pattern-P0-CHRONICLE-PAGE.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-LEARN-STACK | learn | 360 (360×800) | dark | PASS | `2026-10-22-learn-360-dark-accident-P0-LEARN-STACK.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-NEWS-CHROME | news | 360 (360×800) | dark | PASS | `2026-10-22-news-360-dark-accident-P0-NEWS-CHROME.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | news | 1280 (1280×800) | light | PASS | `2026-10-22-news-1280-light-accident.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | news | 360 (360×800) | dark | PASS | `2026-10-22-news-360-dark-general.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | news | 1280 (1280×800) | light | PASS | `2026-10-22-news-1280-light-general.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | civ | 768 (768×1024) | light | PASS | `2026-10-22-civ-768-light-accident.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | civ | 768 (768×1024) | dark | PASS | `2026-10-22-civ-768-dark-accident.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | home | 1280 (1280×800) | light | PASS | `2026-10-22-home-1280-light-accident.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | home | 1440 (1440×900) | light | PASS | `2026-10-22-home-1440-light-accident.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | civ | 1280 (1280×800) | light | PASS | `2026-10-22-civ-1280-light-accident.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3.2 | civ | 1440 (1440×900) | light | PASS | `2026-10-22-civ-1440-light-accident.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-BRAND | home | 360 (360×800) | dark | PASS | `2026-10-22-home-360-dark-wordmark-P0-BRAND.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-AXIS-NODES | home | land (640×360) | dark | FAIL | `2026-10-22-home-land-dark-axis-P0-AXIS-NODES.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-AXIS-NODES | civ | land (640×360) | dark | FAIL | `2026-10-22-civ-land-dark-axis-P0-AXIS-NODES.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-OVERLAP | home | 360 (360×800) | dark | FAIL | `2026-10-22-home-360-dark-P0-OVERLAP.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-CLIP | civ | 360 (360×800) | dark | FAIL | `2026-10-22-civ-360-dark-P0-CLIP.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-HSCROLL | home | 360 (360×800) | light | PASS | `2026-10-22-home-360-light-P0-HSCROLL.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-HSCROLL-COLLIDE | home | 360 (360×800) | dark | FAIL | `2026-10-22-home-360-dark-P0-HSCROLL-COLLIDE.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-FIXED-WIDTH | civ | 360 (360×800) | light | PASS | `2026-10-22-civ-360-light-P0-FIXED-WIDTH.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-TOUCH-44 | home | 360 (360×800) | dark | PASS | `2026-10-22-home-360-dark-P0-TOUCH-44.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-CTA-TARGET | civ | 360 (360×800) | light | FAIL | `2026-10-22-civ-360-light-P0-CTA-TARGET.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-Z-STACK | civ | 360 (360×800) | dark | FAIL | `2026-10-22-civ-360-dark-P0-Z-STACK.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-NAV | home | 360 (360×800) | dark | PASS | `2026-10-22-home-360-dark-P0-NAV.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-CONTRAST | civ | 390 (390×844) | dark | FAIL | `2026-10-22-civ-390-dark-P0-CONTRAST.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-DARK-PAPER | home | 360 (360×800) | dark | FAIL | `2026-10-22-home-360-dark-P0-DARK-PAPER.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-INK-TOKEN | civ | 360 (360×800) | dark | PASS | `2026-10-22-civ-360-dark-P0-INK-TOKEN.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-AXIS-NODES | home | 360 (360×800) | dark | FAIL | `2026-10-22-home-360-dark-P0-AXIS-NODES.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-ROUTE | chronicle | 360 (360×800) | light | PASS | `2026-10-22-chronicle-360-light-P0-ROUTE.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-DOM-EXPECT | civ | 360 (360×800) | light | FAIL | `2026-10-22-civ-360-light-P0-DOM-EXPECT.png` | Grok 4.7（R8 證據，非投票） |  |
| P0-DOM-EXPECT | home | 360 (360×800) | light | FAIL | `2026-10-22-home-360-light-P0-DOM-EXPECT.png` | Grok 4.7（R8 證據，非投票） |  |
| §7.3 | | | | PASS | `2026-10-22-civ-360-light-gaps-outline.png` | Grok 4.7（R8 證據，非投票） | |
| §7.3 | | | | PASS | `2026-10-22-home-640-light-console-P0-RENDER-ERR.png` | Grok 4.7（R8 證據，非投票） | |

## 第 8 項

| ID | 頁 | 視口 | 主題 | 結果 | 檔名 | 檢測席 |
| --- | --- | --- | --- | --- | --- | --- |
| TRAP-V08 | home, civ | 真機 | | DEFERRED | `TRAP-V08-DEFERRED.md` | Grok 4.7（R8 證據，非投票） |

## 幾何與 console

| ID | 頁 | 視口 | 主題 | 結果 | 檔名 | 檢測席 |
| --- | --- | --- | --- | --- | --- | --- |
| P0-RENDER-ERR | home, civ, chronicle, learn, slice, news | 360 監看，圖寬 640 | light, dark | PASS | `2026-10-22-home-640-light-console-P0-RENDER-ERR.png` | Grok 4.7（R8 證據，非投票） |
| §7.3.5 | civ | 360×800 | light | PASS | `2026-10-22-civ-360-light-gaps-outline.png` | Grok 4.7（R8 證據，非投票） |
| TRAP-V02 | 六頁 | 矩陣 | light, dark | PASS | `TRAP-V02.md` | Grok 4.7（R8 證據，非投票） |
| P0-HSCROLL | 六頁 | 矩陣 | light, dark | PASS | `SCROLLWIDTH.md` | Grok 4.7（R8 證據，非投票） |

