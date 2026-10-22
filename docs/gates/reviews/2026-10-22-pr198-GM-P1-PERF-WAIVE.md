# PR #198 GM 豁免：P1-PERF（兩列）

日期：2026-10-22  
決策人：Bad Bot／GROK-GM，代 PP O（ops）  
對象：[#198](https://github.com/jainaspp/world-news/pull/198)  
分支：`cursor/chronicle-three-volumes-p0-d5bd`  
量測：`docs/gates/evidence/r8-pack/` 的 Lighthouse 12.8.2，production `dist/`，渲染器同 Pages Functions，`http://127.0.0.1:4173`。不是 Vite dev。  
狀態：**豁免下面兩列 P1。不是 P0 豁免。未 merge，未 deploy。**

依據 `docs/gates/SITE-MAJOR-UPDATE-GATE.md` §7.2：P1 不計入 Critical。GM 最多豁免 3 條。本文件用 **2** 條，沒有第 3 條。被豁免項在下一次走本閘的部署自動改按 P0 覆核。

## 豁免列

兩列都是淺色。Lighthouse 沒有設定 `darkMode`。視口是 M：Lighthouse mobile emulation **412×823**（≤640），`throttlingMethod: simulate`（行動端 4G 模擬）。INP 審計在 Lighthouse 12 導航模式不存在；實驗室點擊（`lab-interaction.json`）Home 24ms、Civilization 88ms，都低於 200ms，所以這兩列只豁免 LCP，不另開 INP 列。CLS：Home **0**、Civilization **0.015**，都低於 0.1，`P1-CLS` 不在豁免裡。

### 1. Home M 4G LCP

| 欄 | 值 |
| --- | --- |
| 頁 | H `/` |
| 視口 | M，412×823，Lighthouse mobile，simulated 4G |
| 主題 | light |
| 量到的 LCP | **4.4 s**（4351 ms）。元素 `h2.hero-title`。效能分 78 |
| 原因 | 產品 P0 的 Critical 已經是 0。這條 LCP 是開場英雄的揭曉重量（標題在揭曉前維持透明），不是視覺 Critical。 |
| 負責人 | Architecture / Perf |
| 修復落點 | 下一次部署 **`site-major-after-198`**：#198 合併之後、下一次本身要走本閘的站級重大更新部署。不是日曆空檔。該次部署把本列改按 P0 覆核。 |

報告：`lighthouse-home-mobile.report.json`、`lighthouse-home-mobile.report.html`、`2026-10-22-home-412-light-lighthouse-P1-PERF.png`。

### 2. Civilization M 4G LCP

| 欄 | 值 |
| --- | --- |
| 頁 | C `/civilization/` |
| 視口 | M，412×823，Lighthouse mobile，simulated 4G |
| 主題 | light |
| 量到的 LCP | **5.4 s**（5402 ms）。元素 `div.axis-vignette`。效能分 76 |
| 原因 | 產品 P0 的 Critical 已經是 0。這條 LCP 是軸帶英雄圖／暗角的重量，不是視覺 Critical。 |
| 負責人 | Architecture / Perf |
| 修復落點 | 同一個下一次部署 **`site-major-after-198`**（#198 合併之後、下一次走本閘的站級重大更新部署）。該次部署把本列改按 P0 覆核。 |

報告：`lighthouse-civ-mobile.report.json`、`lighthouse-civ-mobile.report.html`、`2026-10-22-civ-412-light-lighthouse-P1-PERF.png`。

## 沒有豁免的

- 任何 P0。Critical 仍必須是 0。本文件不改寫 P0。
- 第 3 條 P1。新聞頁 A 的 Lighthouse 這次沒有跑，也不憑空豁免。
- `P1-CLS`。上面兩個 CLS 都低於 0.1。
- `TRAP-V08`。那是另一份延期（`2026-10-22-pr198-GM-TRAP-V08-DEFER.md`），不是本豁免。

## 下一次部署的名字

**`site-major-after-198`**

定義：PR #198 合併進主幹之後，下一次被標成站級重大更新、因而必須重走 `SITE-MAJOR-UPDATE-GATE.md` 的生產部署。日期留到那次部署排期時再寫；空的日曆本身不是這份豁免的落點，落點是這次部署。負責人 Architecture / Perf 在該次部署前把 Home 與 Civilization 的 M 4G LCP 壓到 ≤2.5s，或在該次閘裡把它們當 P0 處理。
