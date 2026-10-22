# TRAP-V08 — 真機短片未拍，本 PR 記 DEFERRED

日期：2026-10-22  
對象：PR #198（`cursor/chronicle-three-volumes-p0-d5bd`）  
狀態：**DEFERRED（只限本 PR）。不是 PASS。** 日間 PENDING 原文留在下方，沒有改寫成通過。

## GM 延期（2026-10-22 ~20:04 Asia/Hong_Kong）

- 決策人：Bad Bot／GROK-GM，代 PP O。PP O 沒有真機，答「我唔知」；GM 選路徑 A。
- 範圍：只限本次站級重大更新 [#198](https://github.com/jainaspp/world-news/pull/198)（三卷疊十階 P0）。下一次站級重大更新恢復硬要求。
- 變更：`TRAP-V08`（iOS Safari 與 Android Chrome 真機或雲端真機短片，滑完 H `/` 與 C `/civilization/`）以及 §7.3 裡**只**依賴這兩支短片的第 8 項，硬要求延後到下一次站級重大更新。
- 審稿：本 PR 缺這兩支短片記 **DEFERRED**，不得記 **FAIL**。
- 明示：桌面 DevTools 仍然**不算** `TRAP-V08` 通過。這是延期，不是宣稱通過。本目錄沒有、也不會放偽造的真機片。
- 本 PR 仍然要：Critical＝0；P0 刀子不豁免、不可投票豁免；`P1-MIN-FONT` 已在 `160bc78` 修到非裝飾文字 ≥12px；既有 production-build Lighthouse 與模擬矩陣證據在本目錄，索引在 `docs/gates/reviews/2026-10-22-pr198-R3-EVIDENCE.md`。
- 裁決全文：`docs/gates/reviews/2026-10-22-pr198-GM-TRAP-V08-DEFER.md`。
- 下一步：R4 三席重投。本文件不啟動 R4，不合併，不部署。

## PENDING 軌跡（2026-10-22 日間，原文保留）

以下段落是延期之前的 PENDING 紀錄。當日晚的 GM 延期取代了「缺片則整閘不得 PASS」對**本 PR** 的效力：缺片記 DEFERRED，不記 FAIL，仍然不是 PASS。

---

# TRAP-V08 — 真機短片未拍（PENDING）

日期：2026-10-22  
對象：PR #198（`cursor/chronicle-three-volumes-p0-d5bd`）  
狀態：**PENDING。本項未通過。**

這次證據包在雲端代理裡完成。環境沒有實體 iPhone／Android，也沒有接上 BrowserStack、Sauce Labs 或其他雲端真機。因此 **沒有** iOS Safari 短片，也 **沒有** Android Chrome 短片。

## 過關仍然需要

依閘 `TRAP-V08` 與 §7.3 第 8 項，上線前要有：

1. **一支 iOS Safari** 真機（或雲端真機）短片，滑完 **H**（`/`）與 **C**（`/civilization/`）。
2. **一支 Android Chrome** 真機（或雲端真機）短片，同樣滑完 H 與 C。

桌面 Chrome 的 DevTools 裝置模式、本目錄的全長截圖、以及 headless 量測，**不能**當這一項的唯一通過。

請由 PP O，或在雲端真機（BrowserStack 等）各錄一支，放進本目錄後先走 **R4** 三席重投。在這兩支短片附上之前，`TRAP-V08` 維持 PENDING，整閘不得因本文件判 PASS。

本文件沒有、也不會放偽造的真機片。
