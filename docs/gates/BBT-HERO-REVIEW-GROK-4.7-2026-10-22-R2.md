# 文明編年史 · 開場 Hero 再閘（Grok 4.7 · R2）

- 席次：**Grok 4.7**
- 日期：2026-10-22
- 對象：PR #186，分支 `cursor/bbt-hero-opening-eb86`，commit `8859f381657cbcb2035e7c5e8315fcd88e019962`（`fix(hero): clear site-gate criticals on the homepage opening`）
- 上一票：FAIL，Critical＝3（SSR 全文然後拆掉、`#slice` 鑽進貼頂列、星野在高度變化時重洗）＋銅金按鈕對比不足
- 性質：只讀再閘。未改生產碼、未部署、未合併
- 上游：`REVIEW-BRIEF-3MODEL`、`BRIEF-GM-ADOPT-2026-10-21`、`docs/gates/SITE-MAJOR-UPDATE-GATE.md`

## 1. 總評

**PASS。Critical＝0。**

上一輪三條 Critical 與銅金對比，在 `8859f38` 的實測裡都清掉了。首繪把七句藏好，跳過會落到與 React 相同的結束態；`#slice`／`#civ` 的標題落在貼頂列下緣以下 31px 以上；高度只變時星點的橫座標不動；主按鈕「開始編年」指向 `#civ`；墨字 `#161c24` 在 `#a18256` 上是 **4.77:1**。

本席在 headless Chrome 看過無腳本、減動態、以及帶著正式 bundle 的播放。沒有看到全文閃出再被拆掉，也沒有看到星點換一批。動畫是逐句淡入、星點慢閃、爆炸一圈，屬 P0 輕量 canvas，不是壞掉的動畫。

上線仍要另外兩席與 GM 簽字。本票只清 Grok 4.7 這一席的 Critical。

## 2. Critical 清單

（空）

## 3. 覆核方法

正式殼來自 `vite build` 的 `dist/index.html`（CSS 在 `<head>`，模組延後）。首頁 HTML 用 `injectHomeShell` 注入，與 Functions 同一條 SSR 路徑。視口 360×800、390×844、700×900、1280×800。對比用 WCAG 相對亮度手算，並對上 computed style `rgb(161, 130, 86)`／`rgb(22, 28, 36)`。`tests/heroOpening.test.ts` 16 例通過；錨點那幾條斷言是算術恆真，本席以實測間距為準。

| 視口 | 貼頂列高 | `#slice` 標題淨空 | `#civ` 標題淨空 | 橫向溢流 | 首秒句子 |
| --- | --- | --- | --- | --- | --- |
| 360 | 87px | 31px | 51px | 0 | 七句 opacity 0 |
| 390 | 87px | 31px | 51px | 0 | 僅第一句開始淡入 |
| 700 | 87px | 31px | 51px | 0 | 同上 |
| 1280 | 105px | 31px | 59px | 0 | 同上 |

淨空＝標題盒頂減貼頂列底。閘門是 ≥8px。31px 過線。

## 4. 檢測 list

### P0（本輪，Critical）

| ID | 項目 | FAIL 條件 | 結果 |
| --- | --- | --- | --- |
| `C-SSR-BOOT` | SSR 首繪先藏句，跳過可用 | 首繪七句同時可見、CTA 被藏，接著 React 把句子拆掉；或跳過之後重播 | **過**。無模組 200ms：`data-mode=playing`，七句 `data-on=false`、opacity 0。帶 bundle 的 360 首樣同樣七句為 0。約 2s 只開第一句。跳過後 `wn_hero_seen=1`、`settled`、七句打開，跳過鈕收起。減動態直接 `settled`、七句 opacity 1 |
| `C-SLICE-COVER` | `#slice`／`#civ` 不被貼頂列吃掉 | 雜湊落地後標題在貼頂列下緣之上，或淨空 < 8px | **過**。≤700 列高 87px、offset 103px；1280 列高 105px、offset 121px。標題淨空 31–59px |
| `C-STAR-RESHUFFLE` | 高度只變時星野不重洗 | URL 列／svh 讓高度變了，星點換一批隨機位置 | **過**。`syncHeroStarField` 同寬留同一組 `u/v`。實測把 hero 加高約 48px，取樣亮點的 x 不變（360：30→30；390：130→130；1280：86→86；700：60→60），y 只移 2px |
| `P0-CONTRAST-BRASS` | 銅金按鈕字 ≥4.5:1 | `#161c24` 壓在填色上 < 4.5 | **過**。`--brass-ink-fill: #a18256`，computed 與手算 **4.77:1**。舊 `#9a7b4f` 是 4.34:1，按鈕已不使用它。Hero 與 `.axis-hero .btn-brass` 共用此填色 |
| `P0-HANDOFF` | 主路徑進編年 | 主按鈕或「向下滾動」仍指向 `#slice`，或 `#civ` 不存在 | **過**。主按鈕「開始編年」`href="#civ"`，提示同指向 `#civ`，次按鈕「進入今日切片」才是 `#slice`。`#civ` 在軸帶上，落地淨空見上表 |

### P1（不計 Critical；未豁免則仍不得單靠本票上線）

| ID | 項目 | 說明 |
| --- | --- | --- |
| `P1-HYDRATE` | `createRoot` 仍整棵換節點 | 4.5s 實測活節點停在 `bloom`、只開前兩句、`seen` 仍空。4 秒無腳本後備沒有把七句打回這棵活樹。換節點那一幀本席沒有拍到全文閃回 |
| `P1-REWIND` | 掛載晚於第二拍時，過期的 `setTimeout(0)` 會把 `revealed` 從高往低再數一次 | 本機 bundle 在第一拍（0.6s）之前已經接手，沒有復現。慢網若掛載落在 3.3s 之後、15.6s 之前，理論上會閃一句。無腳本的 4 秒後備會把七句打開且**不**寫 `wn_hero_seen`；之後若 React 才換上樹，會從時鐘位置重新收句。本席未拍到這條慢路徑，故不升 Critical |
| `P1-TOUCH-AXIS` | 軸帶 `.axis-cta a` 實高 36px | 390 實測「打開文明總覽」「跳到今日切片」皆 108×36。這是既有站級 `P0-TOUCH-44`，本 commit 只改了填色。Hero 自己的跳過、重播、兩顆 CTA、提示都是 44px。不計入本席本次 Critical |

### P2

| ID | 項目 | 說明 |
| --- | --- | --- |
| `P2-DRIFT` | 星只閃、不漂移 | 規格寫過原子湯慢速漂移。現況是定點 twinkle（約 0.2Hz 量級），沒有跳位。可以留 |
| `P2-TWINKLE` | settled 之後星仍在閃 | 規格已知限制。減動態會停在單幀 |
| `P2-WIDTH` | 寬度四捨五入跨過 1px 會整組重搖 | 高度只變的路徑已鎖。捲軸出現造成的寬度變化仍會重建 |
| `P2-SPEC` | `docs/hero/BBT-HERO-KIMI-K3-SPEC-2026-10-21.md` 第 4 節 CTA 仍寫舊文案 | 碼已改成「開始編年 → #civ」。文件未跟 |

## 5. 必評項

**獨白口吻。** 七句是書面語，宅幽默停在旁白（「砰」沒有聲音、藍色小石頭學會下雨）。`tests/heroOpening.test.ts` 鎖了粵語粒子與紅線詞。新聞、導讀、懶人包這次沒有被改寫。

**逐句、可跳過、無障礙。** 句子揭示後留在版面上。播放中 CTA 是 `visibility: hidden`。跳過在播放時 44×44，實測點擊後 400ms 內其餘句子 opacity 約 0.91，往 1 收。全文留在無障礙樹。減動態走 CSS `transition: none` 與 JS 的 settled 雙路徑，實測直接全文。

**星空。** P0 是 2D canvas，一條 rAF，粒子上限 210，DPR 封頂 2，離屏與隱藏分頁會停。沒有 three.js、gsap、lenis。`prefers-reduced-motion: reduce` 只畫一幀。本席看到的是慢閃星點加一圈擴散，沒有高頻閃、沒有星點瞬移。

**與 chrome、軸、鐘、`#slice`。** Hero 在軸帶之上。390 實測跳過鈕不壓 kicker／標題，軸 CTA 不壓節點。`.axis-slim` 高 258px，低於 300px 上限，CTA 沒有被裁出盒子。手機軸停在四個完整標籤（宇宙、地球、起源、技術），「城市」整顆在視口外，不是切半個字。監測鐘與新聞切片仍在。

**墨紙與章節 token。** Hero 底是 `#161c24` 徑向漸層，沒有 `#05060a`。`--era-ancient #c4a572`、`--era-now #9ec0ef`、`--era-future #2a2140` 只掛在 `.hero-opening`。kicker `#c4a572` 對墨底 **7.32:1**。aside `#a8b0ba` **7.82:1**。未來紫黑是畫布光暈，不是正文。

**8 科與開蒙。** 這包沒有用 8 張卡取代 `/learn/` 的萬有地圖。

**手機。** 360／390 無整頁橫向滾動。Hero 用 `svh`，句子在 normal flow，opacity／transform 揭示。主控 44px。

## 6. 開工建議

P0 最小範圍已經在 `8859f38`。本席不再要求為了過這一席去改生產碼。

若要消 P1，再動也只動這兩處：過期節拍不要用 `setTimeout(0)` 把 `revealed` 往回撥；4 秒後備要看得到 React 換上的那棵樹，慢於 4 秒的掛載才不會先打開七句再收掉。軸 CTA 的 44px 屬站級觸控，另案。

P1 延後仍按 GM BRIEF：three.js／粒子大爆炸要四大合議與 click-to-play；水平 scroll-snap 軸；學科 modal。Functions 配額期間不為這包 redeploy。

## 7. 過關票

Grok 4.7：PASS，Critical＝0。首繪藏句、跳過落定、`#slice`／`#civ` 淨空、同寬星野、銅金 4.77:1、主按鈕進 `#civ`，這台機器上的開場沒有爛動畫。

— Grok 4.7，2026-10-22
