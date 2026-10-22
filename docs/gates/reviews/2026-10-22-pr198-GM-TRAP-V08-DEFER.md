# PR #198 GM 延期：TRAP-V08（只限本 PR）

日期：2026-10-22 ~20:04 Asia/Hong_Kong  
決策人：Bad Bot／GROK-GM，代 PP O  
對象：[#198](https://github.com/jainaspp/world-news/pull/198) 三卷疊十階 P0  
分支：`cursor/chronicle-three-volumes-p0-d5bd`  
狀態：**DEFERRED。不是 PASS。未 merge，未 deploy。**

## 決定

把 `TRAP-V08` 同 §7.3 第 8 項的硬要求，由本次站級重大更新延後到**下一次**站級重大更新。

延後的範圍只包括：

- 一支 iOS Safari 真機或雲端真機短片，滑完 H（`/`）與 C（`/civilization/`）。
- 一支 Android Chrome 真機或雲端真機短片，同樣滑完 H 與 C。
- §7.3 裡**只**依賴這兩支短片才能成立的檢查（即第 8 項，以及與該兩支短片同一件事的判定）。

審稿人對本 PR 缺 `TRAP-V08` 記 **DEFERRED**，不得記 **FAIL**。

桌面 Chrome DevTools 裝置模式仍然不算 `TRAP-V08`。本決定是延期，不是宣稱該陷阱已通過。本倉沒有、也不會放偽造的真機短片。

閘文首 **LOCK 2026-10-22 晚（HKT）** 與此文同效。`docs/gates/evidence/2026-10-22-pr198-r3-bundle/TRAP-V08-PENDING.md` 保留日間 PENDING 軌跡，並改標 DEFERRED。

## 理由

PP O 沒有個人真機，也沒有 BrowserStack 或其他雲端真機帳號，被問時答「我唔知」。GM 選路徑 A：今次把這一項延期，不偽造短片，不把桌面模擬當成真機。

## 仍然擋住的

- **Critical 必須為 0。** P0 不豁免，亦不可由投票或 GM 豁免。本延期不碰到任何 P0 刀子。
- `P1-MIN-FONT` 已在 `160bc78` 修到非裝飾文字 ≥12px。這次延期不重開字級。
- 既有 production-build Lighthouse 與模擬矩陣仍在 `docs/gates/evidence/2026-10-22-pr198-r3-bundle/`，索引在 `docs/gates/reviews/2026-10-22-pr198-R3-EVIDENCE.md`。那些證據裡除第 8 項以外的缺口，不因本決定變成 PASS。
- 其餘 Critical／P0 規則不放寬。下一次站級重大更新起，`TRAP-V08` 與 §7.3 第 8 項恢復硬要求。

## 下一步

**R4 三席重投。** 本文件不代替投票，不啟動 R4，不合併，不部署，不開第二條修復 PR。
