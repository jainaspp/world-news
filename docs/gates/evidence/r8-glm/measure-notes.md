# R8 GLM 量測方法與備註（PR #198）

量測 SHA：`cb312869bd2850c7b3c5d9f75a6545da705ca760`（`cursor/chronicle-three-volumes-p0-d5bd` 尖端，docs-only 提交；產品碼與 R7 量測 SHA `37f7a67` 相同）。

## 環境

- 生產建置：`npm run build` 的 `dist/`。伺服器：`docs/gates/evidence/r8-pack/tooling/serve.mjs`（與 Pages Functions 同一批渲染器：`injectHomeShell`、`renderCivilizationHub`、`renderChroniclePage`、`renderLearnPath`、`renderStoryPage`），`http://127.0.0.1:4173`。不是 Vite dev。
- 首頁 feed：`loadFeeds()` 當次 831 則、錯誤 0；A 頁最長標題 `/story/91e9bae258cd/`（162 字）。一般稿與 R8 pack 那次不同（feed 內容流動），不影響閘項。
- Headless Google Chrome 156.0.8078.47，DPR 1。視口 360×800、390×844。主題以 `localStorage.darkMode` + `prefers-color-scheme` 模擬。截圖前加樣式表既有的 `body.static` 凍結、提早掛 Noto（R8 pack 同法）；Lighthouse 冷啟動不在此列。
- 對比量法與 R7 相同：`scrollIntoView` 後在視窗截圖裁切，色距 > 45 於指定色的像素取中位為底色，對 WCAG 比值。大字（≥24px、或粗體 ≥18.66px）門檻 3:1，其餘 4.5:1。

## 量測檔

| 檔 | 內容 |
| --- | --- |
| `contrast.json` | 對比終值。軸節點 `.yr` 晶片與 `.lab`（C/H 390 淺暗）、軸標題／導語／眉題／主按鈕、暗色圖說家族、淺色 muted 家族、暗色 muted 家族 |
| `measure.json` | 幾何（§2.4 正典碰撞腳本、`scrollWidth`、觸控 ≥44、DOM 骨架）、CTA 點擊落點、console 例外、品牌掃描 |
| `shots/` | 對比裁切、全長圖、同框、切片落點、版頭特寫、hub-hero 上下文圖 |

## 工具備註（何以致兩輪作廢）

1. **CDP `Page.captureScreenshot` 的 `clip` 是文件座標，不是視窗座標**（`captureBeyondViewport` 行為）。第一、二輪裁切以視窗座標傳入，捲動後全部裁錯位置。第三輪起 `clip.y += window.scrollY` 修正；軸節點最終改為整幅視窗截圖後在本機 pngjs 裁切，不再用 clip。
2. **軌道 `scroll-snap-type: x mandatory`**：`scrollIntoView({inline:'center'})` 之後瀏覽器必再吸附，節點在裁切前移位。最終把 `rail.scrollLeft` 設到吸附點（`scroll-padding-inline: 8px`），量到的中位即墨底 `rgb(22, 28, 36)`。
3. 未凍結（無 `body.static`）時揭曉動畫持續改版面，Chrome scroll anchoring 在取樣間跳動。所有終值都在凍結後量。
4. 作廢輪的中位數（例如曾量到 `.yr` 4.5–5.0、hub 圖說 1.54、淺色時鐘 2.9）都不是頁面缺陷，是裁錯位置；頁面像素本身從未改變。本包只保留終值檔。

## 裁切有效性規則

每列終值都要求裁切內 ≥12 個字形色像素（證明裁切真的含該元素的字），否則標 `invalid` 不採用。`.yr` 晶片終值全部有完整字形覆蓋（glyphPx 60–105）。

## 與 R7 的對照

R7 引用的數字在本 SHA 重現：`.yr` 晶片 7.32:1（墨底）、`.lab` 未來 6.25:1、軸標題 13.11:1、導語 7.62:1、眉題 6.48:1、主按鈕 4.77:1、ghost 按鈕 8.42:1、暗色模式卡圖說 9.05:1、淺色時鐘秒數 4.92:1（R7 量 4.69，同一元素、同一閾值門）。差異都在量測噪訊內，方向一致。
