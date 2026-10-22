# 文明編年史 · 開場 Hero 再閘（Kimi K3 · R2）

- 文件 ID：`BBT-HERO-REVIEW-KIMI-K3-2026-10-22-R2`
- 署名：**Kimi K3**
- 日期：2026-10-22
- 對象：PR [#186](https://github.com/jainaspp/world-news/pull/186)，分支 `cursor/bbt-hero-opening-eb86`，HEAD `8859f38`（`fix(hero): clear site-gate criticals on the homepage opening`）
- 上一票：本席 FAIL，Critical＝4（SSR 首幀全文、`#slice` 被黏性 chrome 壓住、`#civ` 手機靜止時標籤切半、銅金對比不足 4.5:1）
- 本輪：只讀。未改 Hero 生產碼、未部署、未合併。
- 量測：Headless Chrome 156.0.8078.47。CSS 用倉內 `src/App.css`。首頁骨架按 `App.tsx` 的 `.chrome`／`.civ-home`／`renderAxisBand({ rails: false })`／`#slice` 組出。星野用 Node 直接執行 `shared/heroStars.ts`。未裝 `node_modules`，未跑 Vite，未跑 iOS Safari。

---

## 1. 總評

**PASS。Critical＝0。**

上一輪四條 Critical 都在 `8859f38` 裡被改掉，而且改的是渲染結果，不是只改測試斷言。本席用瀏覽器重算過，沒有沿用 PR 留言裡的「已測 31px／4.77:1」。單元測試裡 `103 + 15 - 87 ≥ 8` 這種等式本身永遠成立，不能當過閘證據；下面的數字是量出來的。

本票只代表 Kimi K3 這一席。上線仍要三席 3/3，再加上 GM 簽字。不是部署許可。

---

## 2. Critical 清單

無。

---

## 3. 檢測 list

### 3.1 上一輪 Critical 的複測（本輪 P0）

| ID | 項目 | FAIL 條件 | 覆蓋 | 結果 |
| --- | --- | --- | --- | --- |
| `R2-SSR` | `data-mode="playing"` 時，首幀之前旁白必須已隱藏 | 第一個繪製幀仍看得到七句，或 CTA 已 `visibility: hidden` 而句子 opacity 仍接近 1 | 360×800、390×844；CSS 在 `<head>`；boot script 為倉內原文 | **PASS** |
| `R2-SLICE` | `#slice h2` 避開黏性 chrome | h2 上緣與 chrome 下緣間距 < 8px | 360×800、390×844，錨點 `#slice` | **PASS** |
| `R2-CIV` | `#civ` 手機靜止格不切半個標籤 | ≤390 時，scrollLeft＝0 或任一 snap 停點有標籤相交超過 1px | 360、390；七個 snap | **PASS** |
| `R2-BRASS` | 墨字在銅金填色上 | 實色對比 < 4.5:1 | Hero 主按鈕、軸上 `.btn-brass` | **PASS** |
| `R2-CTA` | 主 CTA 交到軸，不交到切片 | 主按鈕或「向下滾動」指向 `#slice` 或 `/civilization/` | SSR 標記與元件同一常數 | **PASS** |
| `R2-STAR` | 星野不得因高度變化重抽 | 僅高度改變卻 `rebuilt: true`，或同一顆星的 `u` 變了 | 360×640 → 360×720；390 寬度對照 | **PASS** |

### 3.2 複測記錄

**`R2-SSR`。** SSR 標記仍是 `data-mode="settled"`、每句 `data-on="true"`（無 JS 與爬蟲看得到全文）。Boot script 在同一個同步回合裡先 `paint(false)`，再寫 `data-mode="playing"`。CSS 只有在 playing 且非 `data-on="true"` 時把句子設為 `opacity: 0`；CTA 同時 `visibility: hidden`。Transition 掛在 `prefers-reduced-motion: no-preference`，880ms。本席擔心的是：樣式在首幀前從「全文可見」改到「隱藏」，過渡可能從 opacity 1 畫出來，屬性順序救不了。

實測不是這樣。360 與 390 的第一個 rAF（分別約 54ms、15ms）：`mode=playing`、七句 `data-on=false`、句子 `opacity=0`、CTA `visibility=hidden`、`document.getAnimations()` 裡沒有句子過渡。截圖只見 kicker「文明編年史 · 開場」、標題「從宇宙到今天」、右上「跳過開場」。七句旁白與兩顆 CTA 都不在畫面上。Chrome 在元素尚未畫過時不啟動這段過渡，首幀直接落在隱藏態。

未能量到的部分：沒有把 Vite bundle 拉起來，所以沒有拍到 `createRoot` 換掉 SSR 節點的那一幀。`HeroOpening` 的初始 state 走 `heroPlaybackAt(__WN_HERO_T0)`；未看過、未減動、elapsed < 600ms 時 `revealed` 為 0，新節點一建立就是隱藏。這擋得住「全文再閃一次」。換節點本身仍可能空一幀，見 P1。

**`R2-SLICE`。** `--home-anchor-offset` 在 ≤700 是 103px，以上是 121px。`#slice` 與 `#civ` 都用它，沒有被後面的 `--civ-anchor-offset: 220px` 蓋掉。Chrome 實高：

| 視口 | chrome（mast + nav + 底邊） | `#slice` 上緣 | h2 上緣 | h2 淨空 |
| --- | --- | --- | --- | --- |
| 360×800 | 87px（40+46+1） | 103.1px | 118.1px | **31.1px** |
| 390×844 | 87px（40+46+1） | 106.5px | 121.5px | **34.5px** |
| 1280×800（對照） | 105px（52+50+邊） | 121.3px | 136.3px | **31.3px** |

360 幾乎貼著 103px 的 scroll-margin，h2 再往下 15px（1px 邊框 + 4px `.today-slice` padding + 10px `.slice-head` padding），淨空 31px。390 的落點比 103px 多約 3.5px，淨空更大，不是更小。兩檔都 ≥ 8px。頁面 `scrollWidth` 與 `clientWidth` 相等，沒有整頁橫向捲軸。

**`R2-CIV`。** ≤640 時 `.deep-axis` 是 scrollport，`container-type: inline-size`，每格 `calc((100cqi - 36px) / 4)`，gap 12px，`scroll-snap-type: x mandatory`。四格加三個間距正好等於 scrollport，第五格（城市）從 port 右緣再過去 12px 才開始。

- 360：scrollport 328px，格寬 73px。scrollLeft＝0 時宇宙／地球／起源／技術整格在內，城市 shown＝−12（完全在外）。七個 snap 停點都沒有 0.5px 以上的半格。
- 390：scrollport 358px，格寬 80.5px。靜止同樣是前四格；城市 shown＝−12。滾到尾時最左可見格（技術）的盒子有 0.5px 在 port 外，低於站閘 1px 容差。字是置中的兩字標，不在這 0.5px 裡。
- 軸帶實高 258px，低於 `.axis-slim` 的 300px，`scrollHeight === clientHeight`，標籤沒有被 `max-height` 從上下裁掉。
- 1280：七格全部在同一行，沒有橫向 scrollport。

**`R2-BRASS`。** 計算樣式：Hero `.hero-btn-brass` 與軸 `.btn-brass` 都是背景 `rgb(161, 130, 86)`（`#a18256`）、字色 `rgb(22, 28, 36)`（`#161c24`）。相對亮度對比 **4.767:1**。舊填色 `#9a7b4f` 配同一支墨字是 **4.340:1**，過不了 4.5。按鈕字約 15px、字重 700，不到大字 3:1 的門檻，所以 4.5:1 是對的門檻。填色不透明，沒有疊在軸上照片上。

**`R2-CTA`。** `HERO_PRIMARY` 是 `開始編年` → `#civ`。次按鈕 `進入今日切片` → `#slice`。提示 `向下滾動，開始編年` → `#civ`。SSR 字串與 `HeroOpening.tsx` 都讀這三個常數。首頁軸帶有 `id="civ"`。DOM 裡主按鈕 `href` 實測為 `#civ`。

**`R2-STAR`。** `syncHeroStarField` 在寬度（四捨五入後）不變時不呼叫 `rollHeroStars`。360×640 再收到 360×720：`rebuilt === false`，`stars` 是同一個陣列，`y` 比例是 720/640。寬度改成 390 才重抽。同一 seed 兩次結果相同。`HeroOpening` 的 resize 只走這條，沒有另一個 `Math.random`。

### 3.3 其餘

| ID | 等級 | 項目 | 結果 |
| --- | --- | --- | --- |
| `R2-P1-SWAP` | P1 | `createRoot` 整節換掉 SSR 節點，不是 hydrate | 已知。首幀全文閃動已不在。單幀空窗本席未在完整 bundle 下拍到 |
| `R2-P1-FALLBACK` | P1 | React 4 秒內沒寫 `data-hero-boot` 時，boot script 把句子揭回 settled，不寫 `wn_hero_seen` | 與程式一致。無 JS 最終看得到全文。本席慢速量測裡這個 timeout 確實會把 playing 翻回 settled |
| `R2-P2-SPEC` | P2 | `docs/hero/BBT-HERO-KIMI-K3-SPEC-2026-10-21.md` 第 4 節仍寫主 CTA「進入今日切片」→ `#slice`、次 CTA 去 `/civilization/` | 規格落後於 `8859f38`。以程式為準。不升 Critical |
| `R2-P2-STAR-WIDTH` | P2 | 寬度四捨五入跨過 0.5px（360.4 保持、360.6 重抽）會重抽星野 | 不是「只改高度」。手機網址列只改高度時不會走到這條 |
| `R2-P2-SKIP-GAP` | P2 | playing 時「跳過開場」下緣與 kicker 上緣的縫：360 約 2px、390 約 5px | 盒子不相交（>1px 才算重疊）。偏緊，未切字 |
| `R2-P2-CLOCK` | P2 觀察 | 監測鐘 kicker `#9a7b4f` 對紙 `#f7f1e6` 約 3.51:1 | 本 commit 聲明不改這支色。不是 Hero 按鈕，不算進本席 Critical |

---

## 4. 必評項

- **獨白口吻。** 七句仍只在 Hero。書面語（「甚麼」），旁白是宅向的輕幽默（「砰」／沒有聲音、原子湯、藍色小石頭）。沒有把這口氣寫進切片標題或新聞卡。本輪沒有改文案。
- **逐句浮現。** 句子留在文件流裡，揭示只動 opacity／transform。首幀 playing 時七句都在、都看不見，CTA 不在 tab 之外的可見層（`visibility: hidden`）。跳過鈕在 playing 時可見，44px 高。減動與已看過的路徑在 boot script 裡於改屬性之前 return，維持 settled。本席瀏覽器只跑了「首次、允許動效」這一條；另外兩條對過原始碼與測試替身，沒有再拍。
- **星空。** 仍是 P0 的 2D canvas，沒有 three.js、gsap、lenis。粒子位置是 seed，高度變化只重映射 `v`。`prefers-reduced-motion` 在元件裡畫一幀靜態、不開 rAF。LCP 沒有新的圖片字體阻塞；本席沒有重跑 Lighthouse。
- **與 chrome／軸／鐘／`#slice`。** Hero 在軸帶之上。主交接去 `#civ`，切片是次按鈕。`#slice` 錨點淨空見上表。監測鐘模組這輪沒改行為。
- **墨紙與章節 token。** Hero 底仍是 `#161c24` 一帶，沒有 `#05060a`。`--era-ancient`／`--era-now`／`--era-future` 只掛在 `.hero-opening`。軸與新聞卡沒有被這三個變數換皮。
- **8 科與開蒙。** 本 commit 沒有把 `/learn/` 收成 8 張卡。不在這輪 diff 裡。
- **手機裁字。** 360／390 的靜止軸標沒有半格。Hero `scrollHeight === clientHeight`，`overflow: hidden` 沒有把標題或句子裁掉。跳過鈕在 390 的右緣是 378，視口 390，沒有推出畫面。

---

## 5. 開工建議

本席不要求再改 Hero 生產碼才能過這一閘。

P0 不必再加範圍。若要收尾，只動文件：把規格第 4 節的 CTA 改成與 `HERO_PRIMARY` 相同（主 `#civ`、次 `#slice`）。那是 P2。

P1 可以以後再做，不擋本席這張票：`createRoot` 改成hydrate 或在替換前把 SSR 節點留到下一幀，消掉換節點的空窗。4 秒 fallback 維持現狀即可。

---

## 6. 過關票

Kimi K3：PR #186 於 `8859f38` 的四條 Critical 經重測已清除，另兩條複檢（主 CTA → `#civ`、星野不因高度重抽）成立。**Critical＝0，本席 PASS。** 上線仍須另外兩席與 GM 簽字。
