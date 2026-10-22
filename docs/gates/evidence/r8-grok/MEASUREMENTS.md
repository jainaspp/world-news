# R8 Grok 4.7 像素量測

日期：2026-10-22  
席：Grok 4.7（投票，不是上線簽字）  
量測 SHA：`cb312869bd2850c7b3c5d9f75a6545da705ca760`  
伺服器：`npm run build` 的 `dist/`，`docs/gates/evidence/r8-pack/tooling/serve.mjs`，`http://127.0.0.1:4173`。渲染器同 Pages Functions。不是 Vite dev。  
樣式：`dist/assets/index-C8bmi6r6.css`，與證據包 Lighthouse 的樣式雜湊相同。本 commit 相對 `37f7a67` 只有文件。

對比量的是字元像素後面的背景，不是色票對色票。做法：把元素截下來，再把字色改成透明截第二次，取有差異的像素。比值用計算色對那些背景像素。抗鋸齒把筆畫中間拉向背景時，另記一欄，不把平塗底的抗鋸齒當成第二層底色。

原始列：`measurements-pass3.json`。

## 先前失手的對比

| 對象 | 頁 | 視口 | 主題 | 字 | 字後背景 | 比 | 門檻 | 結果 | 檔 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `.axis-node .yr` 七顆，含發現／基建／切片／展望 | H | 390×844 | dark | `#c4a572` | `#161c24` 墨底晶片 | **7.32** | 4.5 | PASS | `2026-10-22-home-390-dark-el-axis-node-yr-*.png` |
| `.axis-node .yr` 可見四顆 | H | 360×800 | light | `#c4a572` | `#161c24` | **7.32** | 4.5 | PASS | `2026-10-22-home-360-light-el-axis-node-yr-*.png` |
| `.axis-node .yr` 宇宙至發現 | C | 390×844 | dark | `#c4a572` | `#161c24` | **7.32** | 4.5 | PASS | `2026-10-22-civ-390-dark-el-axis-node-yr-0.png` … `-3.png` |
| `.pattern-card figcaption` | N | 360×800 | dark | `#d2c4b0` | `#2a231b` | **9.05** | 4.5 | PASS | `2026-10-22-chronicle-360-dark-el-pattern-card-figcaption-*.png` |
| `.civ-figure figcaption` | N | 360×800 | dark | `#d2c4b0` | `#0e141c` | **10.80** | 4.5 | PASS | `2026-10-22-chronicle-360-dark-el-civ-figure-figcaption-0.png` |
| `.milestone-figure figcaption` | N | 360×800 | dark | `#d2c4b0` | `#2a231b` | **9.05** | 4.5 | PASS | `2026-10-22-chronicle-360-dark-el-milestone-figure-figcaption-0.png` |
| `.civ-figure figcaption` | origins | 360×800 | dark | `#d2c4b0` | `#0e141c` | **10.80** | 4.5 | PASS | `2026-10-22-origins-360-dark-el-civ-figure-figcaption-0.png` |
| `.bulletin-seconds` | H | 360×800 | light | `#6e675c` | `#f7f1e6` | **4.97** | 4.5 | PASS | `2026-10-22-home-360-light-el-bulletin-clock-bulletin-seconds-0.png` |
| `.bulletin-seconds` | H | 390×844 | dark | `#b7b1a6` | `#161c24` | **8.04** | 4.5 | PASS | `2026-10-22-home-390-dark-el-bulletin-clock-bulletin-seconds-0.png` |
| `.more-today span` | H | 390×844 | dark | `#c9d3df` | `#0e141c` | **12.21** | 4.5 | PASS | `2026-10-22-home-390-dark-el-more-today-span-0.png` |
| `.learn-bound`、`.learn-bearings` | L | 360×800 | dark | `#c9d3df` | `#121820` | **11.78** | 4.5 | PASS | `2026-10-22-learn-360-dark-el-learn-bound-0.png`、`…-learn-bearings-0.png` |
| `.chapter-band .stage-links a` | N | 360×800 | dark | `#9ec0ef` | `#161c24` | **9.17** | 4.5 | PASS | `2026-10-22-chronicle-360-dark-el-chapter-band-stage-links-a-*.png` |
| `.nav-more summary` | L | 360×800 | dark | `#e8e4dc` 一帶 | `#121820` | **14.07** | 4.5 | PASS | `2026-10-22-learn-360-dark-el-nav-more-summary-0.png` |

淺色秒數的筆畫中間被抗鋸齒拉到約 3.6:1。字後背景像素仍是平塗 `#f7f1e6`，指定色 `#6e675c` 是 4.97:1。這不是照片或第二層底色。不記 Critical。

## 同一次抽到的軸上字

390 暗色，軸圖最亮一段的實際背景：

| 對象 | 比 | 背景像素 | 結果 |
| --- | --- | --- | --- |
| `.axis-title`（27.2px 粗體，門檻 3） | 13.38 | `#23272b` | PASS |
| `.axis-lede` | 6.97 | `#333333` | PASS |
| `.axis-hero .kicker` | 7.16（H）／6.73（C） | `#191e25`／`#202328` | PASS |
| `.axis-node .lab` 宇宙至技術 | 6.25–6.78 | `#353534`–`#3d3a35` | PASS |
| `.civ-hub-hero figcaption` | 9.29 暗／9.59 淺 | 圖上淺石 `#cdbda0`／`#d0c0a3` | PASS |

## 靜止首屏幾何

`scrollY = 0`，正典 §2.4 選擇器，只算當時在視窗內的盒子。

| 頁 | 視口 | 主題 | 正典相交 | 頁面溢出 | 半個字的軸標 | 觸控盒 < 44 |
| --- | --- | --- | --- | --- | --- | --- |
| H | 390×844 | dark | 0 | 否（390＝390） | 0 | 0 |
| H | 360×800 | light | 0 | 否 | 0 | 0 |
| H | 360×800 | dark | 0 | 否 | 0 | 0 |
| C | 390×844 | dark | 0 | 否 | 0 | 0 |
| C | 360×800 | light | 0 | 否 | 0 | 0 |
| N | 360×800 | dark | 0 | 否 | — | 0 |
| L | 360×800 | dark | 0 | 否 | — | 0 |
| H、C | 640×360 land | dark | 0 | 否 | 0 | 0 |

≤640 的 `.deep-axis` 是內部橫滑。停住時視窗裡是宇宙、地球、起源、技術四顆；城市及之後整顆在滑軌外（可見寬度 ≤ 0，沒有切到半個字）。這是允許的內部橫滑，不是 `P0-CLIP`。

版頭圖示（搜尋、主題、繁、收藏、關注）、主欄目晶片、兩顆軸 CTA，量到的盒子都 ≥ 44×44。首頁 CTA「打開文明總覽」→ `/civilization/`。總覽 CTA「閱讀人類起源」→ `/civilization/origins/`，「跳到今日切片」→ `/#slice`。字標 aria-label 是「文明編年史」。

骨架：H 有軸、`.axis-cta`、`.chronicle-band`、三張 `.volume-card`、`.axis-rails`、`#slice`。C 有 `.axis-title`、`.deep-axis`、`.axis-cta`、三張 `.volume-card`、`.pattern-axis`、`.case-axis`。N 有 `#ch-ancient`、`#ch-now`、`#ch-future` 與 `#stage-1`…`#stage-10`。這些頁面沒有 uncaught exception。

視窗圖：`2026-10-22-home-390-dark-axis-P0-CONTRAST.png`、`2026-10-22-civ-390-dark-axis-P0-CONTRAST.png`、`2026-10-22-civ-390-dark-hub-hero.png`、`2026-10-22-civ-360-light-hub-hero.png`。
