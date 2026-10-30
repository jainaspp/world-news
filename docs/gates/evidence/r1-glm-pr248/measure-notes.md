# R1 GLM 5.3 — PR #248 量測紀錄

- 日期：2026-10-23（UTC）
- 量測 SHA：`e3a44907847ffc541b28c3d1de137cf12d96dd9e`（PR #248 head，`cursor/wave0-chronicle-optimizations-50e0`）
- 對照 SHA（before）：`d939a0a`（`origin/main` 尖端，#198 合併）
- 工具：puppeteer-core 驅動系統 `google-chrome`（headless new），`--force-device-scale-factor=1`，每頁開獨立 incognito context、攔截 `sw.js` 與 Google Analytics（避免 service worker 跨頁覆寫路由）
- 伺服器：`vite dev`（SSR middleware）與 `vite preview`（production `dist/`，同一批 functions 渲染器）各測一輪，關鍵數字兩者一致
- 視口：360×800、390×844（isMobile、hasTouch）。主題：`localStorage.darkMode` 強制 light/dark，另核 `html.dark` 生效
- 頁面：H `/`、C `/civilization/`、N `/civilization/chronicle/`、origins、tech、city（SSR）；S 走 `/#slice`。L `/learn/` 在本席環境未接 vite middleware（`functions/learn` 存在但 `vite.config.ts` 沒 import），記未測，不記 FAIL

## CI 對應

- `npx vitest run`：67 files、**411 passed**（PR 正文宣稱一致）
- `tsc --noEmit`：通過

## 三個 PR 目標的 before → after（headless 實測）

| 項目 | before（`d939a0a`） | after（`e3a4490`） |
| --- | --- | --- |
| 表格捲動陷阱 | `.civ-article` scrollWidth 546 vs clientWidth 328（360；橫向被軌吃掉 218px，`overflow-x: auto`）；390 為 546 vs 358 | 360：328=328；390：358=358。`.civ-table` 同 328=328／358=358。`documentElement.scrollWidth−clientWidth` 全格 0 |
| 頂部跳到階段導航 | `nav[aria-label="跳到階段"]` 在頁頂 | 頁頂只有 `nav[aria-label="跳到卷"]`（卷一 古／卷二 今／卷三 未來）；`#stage-1`…`#stage-10` 十錨全在；`古卷刻度`（01–05）與 `今卷刻度`（06–10）留在各卷章內 |
| hub 起源三重 | `<h3>人類起源</h3>` ×2；`.deep-time-grid` 內另有第三張 人類起源 卡 | `<h3>人類起源</h3>` 恰 1（文明層卡）；深時間板只剩 宇宙長河＋地球生命；軸鍵「閱讀人類起源」→`/civilization/origins/` 不變 |

## 幾何與點擊（after）

- §2.4 正典碰撞腳本：H、C、N × 360/390 × 淺暗 × 首屏/頁尾全格回傳**空**（origins、tech、city 亦空）
- 觸控：`.chronicle-nav .chip`、`.stage-dot`、`.pattern-axis .chip`、`.case-axis .chip`、`.axis-cta a`、`.axis-node a`、`.civ-nav a`、版頭圖示 0 個 < 44。古卷刻度晶片實測 79–127×44，列間 edge gap 8px
- 貼頂層與落點：sticky `.chrome` 實高 H 161 / C 117 / N 202 ≤ `--civ-anchor-offset` 220 / 133 / 218。點「跳到今日切片」（H、C 出發）落 `#slice`，標題距貼頂列 16–21px；N 點 卷二 今 落 `#ch-now` h2 距 63px；點 `#stage-6` 落 177 vs 貼頂 202 之下留 15px。全數 ≥8px
- 軌道滑動（TRAP-V05 headless 類比）：`.deep-axis` 與 古卷刻度 滑到末端 0 半切晶片、頁面 `scrollWidth` 不變；軸節點要嘛整顆在軌內要嘛整顆在外（吸附）
- 對比（computed color 對實底抽樣）：C 390 暗軸 yr 7.32、lab 9.46、標題 15.24、導語 9.46、kicker 7.32、切片眉題 7.9；N 390 淺晶片 15.24、表頭/表身 15.1；N 390 暗晶片 11.34、表頭/表身 17.06。全 ≥4.5
- 暗色章扉：N 三條 `.chapter-band` 底 `rgb(22,28,36)`（墨）字 `rgb(247,241,230)`（紙）
- console：0 uncaught exception；僅本席攔截 `sw.js`／analytics 產生的 ERR_FAILED

## 效能（P1-PERF→P0 覆核抽樣，非 Lighthouse 正典）

production `dist/` + preview middleware，CDP 模擬 Lighthouse mobile 節流（slow 4G：1.6Mbps／150ms RTT；CPU 4×），360 淺色，單跑取 LCP：

| 頁 | LCP（本席模擬） | R8 正典 Lighthouse（倉內紀錄） | 門檻 2.5s |
| --- | --- | --- | --- |
| Home | 1456ms | 4.4s | 兩數矛盾，記未證實，待正典 |
| Civ | **11032ms** | **5.4s** | 兩數一致超標 → 覆核 FAIL |
| Chronicle | 2496ms | 未量 | 模擬值貼線 |

Civ hub 的英雄圖與字體在本 PR 沒動；R8 的 5.4s 豁免列指定「修復落在下一次走本閘的部署」，本次未見修復。

## 截圖

`shots/`：H/C/N × 360/390 × 淺暗 × 首屏/頁尾 共 24 張，另 5 張特寫（`zoom-chronicle-360-light-volnav`、`zoom-chronicle-360-light-table`、`zoom-civ-360-dark-deeptime`、`zoom-civ-360-dark-axis`、`zoom-home-360-light-axis`）。H 首屏截圖含 BBT 開場 Hero（#241 已過閘、本 PR 未動）：量測時以「跳過開場」還原軸帶再量。

完整機器讀值在 `gate-results.json`。
