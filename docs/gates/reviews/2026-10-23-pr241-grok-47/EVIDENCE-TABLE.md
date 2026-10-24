# 證據表 — Grok 4.7 R1 / PR #241

SHA：`428fe73ca9cd53f3119805b8d36c9ec52ef0fa32`  
席：Grok 4.7  
全表數字：`measurements-summary.json`

只列本席實際量過的格子。沒有檔的格子是未測，不是 PASS。

| ID | 頁 | 視口 | 主題 | 結果 | 檔名 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| 執行卡 1 | home | 360 | light | 有圖 | `2026-10-23-home-360-light-full.png` | 全長 |
| 執行卡 1 | home | 360 | dark | 有圖 | `2026-10-23-home-360-dark-full.png` | 全長 |
| 執行卡 1 | home | 390 | light | 有圖 | `2026-10-23-home-390-light-full.png` | 全長 |
| 執行卡 1 | home | 390 | dark | 有圖 | `2026-10-23-home-390-dark-full.png` | 全長 |
| 執行卡 1 | civ | 360 | light | 有圖 | `2026-10-23-civ-360-light-full.png` | 全長 |
| 執行卡 1 | civ | 360 | dark | 有圖 | `2026-10-23-civ-360-dark-full.png` | 全長 |
| 執行卡 1 | civ | 390 | light | 有圖 | `2026-10-23-civ-390-light-full.png` | 全長 |
| 執行卡 1 | civ | 390 | dark | 有圖 | `2026-10-23-civ-390-dark-full.png` | 全長 |
| P0-OVERLAP | home, civ | 360, 390 | light, dark | PASS | 上列全長；`measurements-summary.json` | 正典選擇器空。播放取樣亦空 |
| P0-BRAND | home | 360 | dark | PASS | `2026-10-23-home-360-dark-masthead-P0-BRAND.png` | 五字字標圖完整，無「编年史」 |
| P0-BRAND | home | 360 | light | PASS | `2026-10-23-home-360-light-masthead.png` | 同上 |
| P0-BRAND | civ | 360 | light, dark | PASS | `2026-10-23-civ-360-light-masthead.png`、`2026-10-23-civ-360-dark-masthead.png` | 同上 |
| P0-HSCROLL | home, civ | 360, 390 | light, dark | PASS | `measurements-summary.json` | `scrollWidth === clientWidth` |
| P0-TOUCH-44 | home | 360 | dark | PASS | 全長＋摘要 | 列舉主控 ≥44。字標連結高 28，不在點名清單，不另計 Critical |
| P0-CLIP | home | 360 | dark | FAIL | `2026-10-23-home-360-dark-axis-P0-CLIP.png` | 城市／今天／未來的 `.lab` 過 `clipped()` |
| P0-CLIP | civ | 360 | dark | FAIL | `2026-10-23-civ-360-dark-axis-P0-CLIP.png` | 同一條 |
| P0-CLIP | home, civ | 360, 390 | light, dark | FAIL | 八張全長 | 同一組標籤。Critical 只計這一條 ID |
| P0-DOM-EXPECT | home, civ | 360, 390 | light, dark | PASS | 全長＋摘要 | H、C 必有件在。N 未測 |
| P0-INK-TOKEN | home | 390 | light, dark | PASS | 英雄 settled 圖 | 英雄底 `rgb(22, 28, 36)` |
| 開場 opacity | home | 390 | light | PASS | `2026-10-23-home-390-light-hero-playing.png`、`2026-10-23-home-390-light-hero-settled.png` | 播放與 settled 標題 opacity 都是 1 |
| 開場 opacity | home | 390 | dark | PASS | `2026-10-23-home-390-dark-hero-playing.png`、`2026-10-23-home-390-dark-hero-settled.png` | 同上 |
| 開場 settle | home | 390 | light, dark | PASS | 同上＋摘要 | 11.9s 仍 playing 且六行已現；12.7s settled。`data-hero-boot=1` |
| 減動態 | home | 390 | light | PASS | `2026-10-23-home-390-light-hero-reduced.png` | 300ms 已 settled，標題 opacity 1 |
| P0-CTA-TARGET | home, civ | 360 | light, dark | 未測 | 全長只證明文案在 | 沒有點擊 |
| P0-RENDER-ERR | home, civ | 360, 390 | light, dark | 未測 | 摘要裡的 console 列 | 無 pageerror。缺面板截圖 |
| P0 覆核 LCP | home, civ | M 4G | light | 未測 | — | #198 豁免列改按 P0 覆核。本席沒有 Lighthouse |
| TRAP-V08 | home, civ | 真機 | | FAIL | `TRAP-V08.md` | 無 iOS Safari、無 Android Chrome 短片。延期已失效 |
| §7.3 其餘 | 六頁矩陣 | 全 | 全 | 未測 | — | 缺圖不得 PASS |

檢測席欄：以上全部是 Grok 4.7。
