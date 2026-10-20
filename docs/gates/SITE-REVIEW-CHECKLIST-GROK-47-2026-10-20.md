# 站級重大更新檢測清單（Grok 4.7）

| 欄位 | 內容 |
| --- | --- |
| 文件 ID | `SITE-REVIEW-CHECKLIST-GROK-47-2026-10-20` |
| 日期 | 2026-10-20 |
| 檢測席 | Grok 4.7 |
| 性質 | 獨立清單。未與 Kimi K3、GLM 5.3 對稿，不代替 GM 合併後的唯一上線閘 |
| 站 | [world-news.xyz](https://world-news.xyz)（本倉 `jainaspp/world-news`） |
| 品牌字樣 | 文明編年史 |
| 墨色 | `#161c24`（軸帶、`.axis-hero`、`.chronicle-band`） |
| 紙色 | `#f7f1e6`（紙卡、模式卡晶片、編年圓點底） |
| 輔色 | 銅金 `#c4a572`／`#9a7b4f`（飾線、軸軌、主按鈕；不是第二套頁底） |
| 範圍 | 只定檢測與過關規則。不改應用碼、不改 CSS、不改文明文案 |
| 事故樣本 | 2026-10-20 手機實機，暗色，位址列 `world-news.xyz/civi…`（文明總覽）。軸、跳到今日切片、編年圓點、模式卡與案例晶片疊在同一帶，字標與標題左緣被裁 |

本清單把該張截圖當成已發生的 P0，用來規定「怎樣的畫面必須判失敗」。修掉之後仍要用同一組條件重測，不能改口徑。

---

## 1. 重大更新定義

### 1.1 觸發全站閘

一次變更只要碰到下面任一項，就是重大更新。重大更新必須走本閘（合併後的唯一清單），全部 P0 為 0，並滿足第 4 節的票與證據，才可以部署到 world-news.xyz。

| ID | 觸發 |
| --- | --- |
| `GATE-HOME` | 首頁殼或首屏：masthead、`.chrome`、`.civ-nav`、`.axis-hero`、`.chronicle-band`、`.axis-rails`、`.today-slice`、`#slice`、今日落點 |
| `GATE-AXIS` | 文明軸：深時間軸（`.deep-axis`、`.milestones`、`.axis-node`）、軸上 CTA（`.axis-cta`）、編年帶（`.chronicle-strip`、`.stage-dot`）、模式卡軌（`.pattern-axis`）、案例軌（`.case-axis`） |
| `GATE-CSS` | 全域樣式：`src/App.css`、`public/columns.css`、`:root` 與 `html.dark` 的色、字級、間距、`z-index`、`position`、`overflow`、負 margin、`max-height`、字體堆疊 |
| `GATE-NAV` | 導航結構：字標、搜尋、主題切換、繁簡／語言、主欄目（文明、編年、今天、開蒙）、更多、訂閱、欄目晶片列 |
| `GATE-MOTION` | 動畫系統：`--motion-*`、`.civ-reveal`、軸軌或圓點的過渡、`prefers-reduced-motion` |
| `GATE-ROUTE` | 路由或文件殼：`functions/civilization` 的 `PAGES` 鍵、首頁與欄目的 HTML 殼、canonical、全站共用 header／footer |
| `GATE-BRAND` | 讀者看得見的品牌字樣「文明編年史」，或墨 `#161c24`、紙 `#f7f1e6` 的實際塗色 |
| `GATE-CHROME` | 會跟著每一頁走的版頭、版尾、跳過連結、回到頂部、暗色切換 |
| `GATE-ADS` | 解除廣告凍結，或在頁面插入廣告、錨點廣告、插頁廣告的 DOM |

拿不準是否觸發時，走全站閘。

### 1.2 免閘

以下變更不開本閘，沿用該變更自己的審稿即可。

| ID | 免閘 |
| --- | --- |
| `SKIP-TYPO` | 單篇已發布稿的錯字、標點、空格。不改模板、不改 class、不改 DOM 順序 |
| `SKIP-ARTICLE` | 單篇導讀、懶人包、分析、週報的正文替換。版面元件與全域 CSS 不動 |
| `SKIP-PIN` | 單則資料針：某一則 RSS 標題、一則當年今日紀事、一個 KV 欄位。不改列表元件的結構與樣式 |
| `SKIP-COPY-DATA` | 文明編年或模式卡的純文字增補：不新增路由、不改 class、不改 CSS、不改同一屏裡的 DOM 順序 |
| `SKIP-INTERNAL` | 讀者看不到的註釋、測試斷言、`SCHEMA` 說明 |
| `SKIP-LOCK` | 不改變前端執行結果的鎖檔或依賴補丁。會改畫面或互動的前端套件升級仍走全站閘 |

免閘項目若順手改了第 1.1 節的任何檔或選擇器，整次變更改判全站閘。

### 1.3 仍算重大更新的邊界

| 情況 | 判定 |
| --- | --- |
| 只改一頁文案，但動到共用局部（chrome、footer、軸帶、晶片） | 全站閘 |
| 只換一張圖，同時改了 `object-fit`、`aspect-ratio`、英雄區高度或 `overflow` | 全站閘 |
| 首頁把編年帶、模式軌拆出 `.axis-hero`，或總覽把它們放回英雄區 | 全站閘。這兩套 DOM 是 2026-10-20 事故的兩個現場 |
| 只改 ≤720px 的 `overflow`、`position`、負 margin、`max-height` | 全站閘 |
| 後端抓取、分類、模型路由，回應 HTML 與 CSS 都不變 | 免閘 |

---

## 2. 檢測清單

### 2.1 覆蓋面

視窗（CSS 像素，直向為主）：

| 代號 | 視窗 | 對應 |
| --- | --- | --- |
| `VP-360` | 360×800 | 窄手機。事故最容易再現 |
| `VP-390` | 390×844 | 常見手機，仍屬 ≤640 |
| `VP-768` | 768×1024 | 平板 |
| `VP-1280` | 1280×800 | 桌面 |
| `VP-LAND` | 640×360 | 手機橫向。只用於標了橫向的項目 |

主題：淺色、`html.dark`。暗色頁底可以是 `#0e141c`；軸帶與編年帶仍須是墨 `#161c24`。紙卡在淺色是 `#f7f1e6` 上的 `#161c24`。

頁面集合：

| 集合 | 頁 | 何時必跑 |
| --- | --- | --- |
| A 事故帶 | `/` 首頁、`/civilization/` 文明總覽 | 每一次全站閘。含軸、CTA、編年圓點、模式卡與案例晶片 |
| B 必測頁 | A，再加上 `/civilization/chronicle/` 編年、`/learn/` 開蒙、今日切片落點（按下「跳到今日切片」或打開 `/#slice`）、一則真實新聞頁（`/briefing/…`、`/explainer/…`、`/story/…` 擇一當日有正文的 URL） | 每一次全站閘 |
| C 抽測 | `/civilization/cosmos/`、`/earth/`、`/origins/`、`/tech/`、`/city/`、`/today/`、`/major/`、`/on-this-day/` 任一有資料之日、`/404` | `GATE-CSS`、`GATE-CHROME`、`GATE-AXIS`、`GATE-ROUTE` |
| D 升格 | 變更碰到全域 CSS、token、字體或 chrome | 覆蓋從改動頁升到至少 B；軸或英雄區則 A+B+C |

元件不存在時：該頁本來不該有此元件（新聞頁沒有深時間軸）記 N/A，並在證據表寫「N/A」。該頁應該有、DOM 卻消失，記 FAIL。文明總覽必須同時有 `.axis-title`、`.deep-axis`、`.axis-cta`、`.chronicle-strip`、`.pattern-axis`、`.case-axis`。首頁必須有軸、`.axis-cta`、`.chronicle-band`、`.axis-rails`（內含模式軌與案例軌）、`#slice`。

首頁與總覽是兩套結構，都要跑。首頁用 `.axis-hero.axis-slim`（編年與模式軌在英雄區外，≤720px 有 `max-height: 300px` 與 `overflow: hidden`）。總覽把編年帶與兩條晶片軌放在同一個 `.axis-hero` 裡，主按鈕文案是「閱讀人類起源」。2026-10-20 的截圖是總覽這一組。

### 2.2 量測方法

在目標視窗、目標主題打開頁面，滾到該元件所在的首屏，於開發者工具主控台執行。這段只讀幾何，不改頁面。

重疊（回傳的每一對都是 FAIL，允許 1px 抗鋸齒）：

```js
const sels = ['.chrome','.axis-title','.axis-lede','.deep-axis','.axis-cta','.chronicle-strip','.chronicle-band','.pattern-axis','.case-axis','.civ-nav'];
const nodes = sels.flatMap((sel) => [...document.querySelectorAll(sel)].map((el) => ({ sel, el, r: el.getBoundingClientRect() }))).filter((n) => n.r.width > 0 && n.r.height > 0);
const hit = [];
for (let i = 0; i < nodes.length; i++) {
  for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const x = a.r.left < b.r.right - 1 && a.r.right > b.r.left + 1;
    const y = a.r.top < b.r.bottom - 1 && a.r.bottom > b.r.top + 1;
    if (x && y) hit.push([a.sel, b.sel]);
  }
}
hit;
```

裁字（視窗或 `overflow` 不是 `visible` 的祖先切到元素邊框，即 FAIL）：

```js
function clipped(el) {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  if (r.left < -1 || r.right > innerWidth + 1) return true;
  for (let p = el.parentElement; p; p = p.parentElement) {
    const s = getComputedStyle(p);
    if (!/(hidden|clip|auto|scroll)/.test(s.overflow + s.overflowX + s.overflowY)) continue;
    const pr = p.getBoundingClientRect();
    if (r.left < pr.left - 1 || r.right > pr.right + 1 || r.top < pr.top - 1 || r.bottom > pr.bottom + 1) return true;
  }
  return false;
}
```

整頁橫向滾動：`document.documentElement.scrollWidth > document.documentElement.clientWidth + 1` 即 FAIL。元件內部的橫滑（編年圓點軌、晶片列）可以存在，條件見 `P0-HSCROLL-COLLIDE`。

觸控盒：`getBoundingClientRect()` 的寬與高都要 ≥ 44。只量第 `P0-TOUCH-44` 列出的主控，不量正文裡的行內文字連結。

對比：用實際像素（含軸上照片與暗角），不要只用 token 對 token。正文與按鈕字 < 4.5:1 為 FAIL；字級 ≥ 24px 或粗體 ≥ 18.66px 的大字 < 3:1 為 FAIL。

`overflow: hidden` 把字藏起來，仍算裁字，不算通過。

### 2.3 P0 必殺

任一條 P0 在其覆蓋面上失敗，整閘失敗。P0 在合併閘裡計為 Critical。

| ID | 項目 | FAIL 條件 | 覆蓋 |
| --- | --- | --- | --- |
| `P0-OVERLAP-AXIS-STACK` | 軸、CTA、編年圓點、模式卡、案例晶片彼此分開 | `.axis-title`、`.axis-lede`、`.deep-axis`、`.axis-cta`、`.chronicle-strip`（或首頁的 `.chronicle-band`）、`.pattern-axis`、`.case-axis`、`.civ-nav`、`.chrome` 之中，任何兩個沒有包含關係的盒子相交超過 1px。2026-10-20 截圖即此條：銅金按鈕「跳到今日切片」壓在編年圓點 02–06（農業革命、城市與文字、古典帝國、跨區交流、科學啟蒙）上；「閱讀人類起源」與軸節點「起源」疊在同一帶；模式卡「功率的儲存與維修」「信息 · 複製與校驗」「貨幣 · 度量的互通」與案例晶片「印刷與知識成本」「齒輪裝置的中斷條件」再疊上去 | A；`VP-360`、`VP-390`、`VP-768`、`VP-1280`；淺色與暗色 |
| `P0-CLIP-GLYPH` | 可讀字不被視窗或 overflow 切開 | 字標、主欄目晶片、`.axis-title`、`.axis-lede`、`.axis-node` 的 `.lab`／`.yr`、`.axis-cta` 按鈕、`.stage-dot .name`、`.pattern-axis .chip`、`.case-axis .chip` 有任一元素 `clipped()` 為真，或肉眼可見半個字。截圖已出現：字標只剩「年史」；主欄目只剩「年」；標題只剩「一條很長的時間軸上」（缺「站在」）；導語左緣缺「軸由宇宙走」；案例晶片只剩「…別與知識成本」「…敗 · 齒輪裝置的中斷條件」。各行裁切量可以不同，不得用「整頁有沒有同一位移」放行。首頁 `.axis-slim` 的兩行截斷若把 CTA、節點或標題首字裁出盒子，同樣 FAIL | A+B；四個直向視窗；兩主題。開蒙與新聞頁改量該頁的 h1、主按鈕、導航晶片 |
| `P0-BRAND-WORDMARK` | 品牌字樣完整 | 版頭可見字樣不是完整的「文明編年史」（SVG 或 `.logo-word` 都算）。只剩「年史」「文明」或被圓點、搜尋鈕蓋住，FAIL。`document.title`、頁尾、404、離線頁出現其他站名，FAIL。英文介面可以另有英文說明，版頭中文站名仍須完整，或由清晰的完整字標圖代替 | B；`VP-360` 與 `VP-1280`；兩主題 |
| `P0-OVERFLOW-X` | 頁面本身不橫向滾動 | `documentElement.scrollWidth` 比 `clientWidth` 大超過 1px。負 margin（`.axis-hero`、`.chronicle-band`、`.bulletin-clock` 的 `-16px`）把內容推出視窗，FAIL。英雄區 `overflow: hidden` 只是把溢出藏住，元素仍然 `clipped()`，FAIL | A+B；四個直向視窗；兩主題 |
| `P0-Z-STACK` | 層級不互相蓋字 | 軸圖暗角（`.axis-vignette`）蓋住標題、節點、按鈕或圓點的字，FAIL。`.axis-cta` 畫在 `.chronicle-strip` 或 `.stage-dot` 之上，FAIL。`.civ-more` 選單打開時蓋住它指向的項目以外的主按鈕，或關不上，FAIL。固定的回到頂部蓋住主 CTA、編年圓點或模式卡晶片，FAIL。預期層級：暗角在內容下；`.chrome` 貼頂；主內容不壓到另一塊主內容 | A+B；`VP-360` 與 `VP-1280`；暗色（軸圖最深） |
| `P0-STICKY-FIXED` | 貼頂列與固定鈕不吞內容 | `.chrome` 是貼頂（sticky）。按下「跳到今日切片」後，今日切片標題必須整段落在貼頂列下緣之下，間距 ≥ 8px。哈希目標（編年階段、模式卡、開蒙條目）被貼頂列遮住，FAIL。任何 `position: fixed` 的元件與主控盒子相交，FAIL。頁內不得再出現第二條黏住的編年軌 | B；`VP-360`、`VP-768`、`VP-1280`；兩主題。須真的點擊，不只看靜止畫面 |
| `P0-HSCROLL-COLLIDE` | 橫滑軌不撞其他層 | `.chronicle-track`、`.chrome .chip-scroller`、`.pattern-axis`、`.case-axis` 可以橫滑。FAIL 若：橫滑軌與另一主區塊相交；滑動中晶片畫進貼頂列、CTA 或圓點；滑到中間時一個晶片被切成半個字（切在軌的內緣 padding 內的完整晶片才可停）；≤720px 的 `flex-wrap: wrap` 加上父層 `overflow: hidden` 使晶片疊進上一列。手指橫滑時頁面跟著左右晃，FAIL | A；`VP-360` 與 `VP-390`；暗色。編年長頁的階段內模式卡另在 `VP-360` 看一次 |
| `P0-TOUCH-44` | 主控觸控盒 ≥ 44px | 下列元件的盒子寬或高 < 44：版頭圖示鈕（搜尋、主題、語言）、主欄目晶片、更多、訂閱、`.axis-cta a`、`.axis-node`、`.stage-dot`、`.pattern-axis .chip`、`.case-axis .chip`。現況裡按鈕 `min-height: 36px`、≤720px 的版頭圖示鈕 32px、編年圓點 40px、軸上圓點 14px，都要連同文字標籤一起量整顆可點盒；標籤把盒子撐到 ≥ 44 可以過，只靠 14px 圓點則 FAIL。兩顆主控中心距 < 8px 也 FAIL（截圖裡按鈕與圓點中心已經重疊） | A+B 的導航與主按鈕；`VP-360`；淺色與暗色 |
| `P0-CONTRAST-INK` | 墨底上的字讀得見 | 在軸帶實際像素上（含 `civ-home-axis-bg` 與暗角，不只平塗 `#161c24`）量到：`.axis-title`、`.axis-lede`、節點 `.lab`、CTA 字、編年名稱、紙色晶片上的 `#161c24` 低於第 2.2 節的對比門檻。銅金小字（`.kicker`、`.yr`）低於 4.5:1，FAIL。暗色紙卡若把正文留在淺色紙的深字配方以外，必須重量，低於門檻即 FAIL | A；`VP-390`；兩主題，暗色必量軸圖最亮的一段 |
| `P0-CTA-TARGET` | 跳到今日切片進得了切片 | 「跳到今日切片」可見、可點、文案完整，點擊後落在 `#slice`（總覽指向 `/#slice` 則必須離開總覽並落在首頁切片）。落點被貼頂列遮住，或點擊被編年圓點／模式卡吃掉，FAIL。總覽主按鈕「閱讀人類起源」必須整句可見，並進入 `/civilization/origins/`。首頁主按鈕「打開文明總覽」必須整句可見，並進入 `/civilization/` | A；`VP-360` 與 `VP-1280`；兩主題。須點擊 |
| `P0-DARK-PAPER` | 暗色不把軸與紙卡混成一塊 | `html.dark` 下軸帶與編年帶仍是墨底淺字；紙卡（今日落點、模式卡正文、層卡）仍是紙底墨字，或對比達標的暗紙。軸上的紙色晶片（模式卡、案例）字色若跟墨底相同而消失，FAIL。不得把整頁刷成另一套站的底色。淺色新聞區保持冷灰，不整頁鋪紙 | A+B；`VP-360` 與 `VP-1280`；只測暗色，並與淺色各留一張對照 |
| `P0-NEWS-CHROME` | 新聞頁沿用同一版頭且不自相覆蓋 | 所選新聞頁：完整字標、主欄目可點、標題不被貼頂列遮住、沒有整頁橫向滾動、主按鈕與圖示 ≥ 44px、正文不與固定鈕重疊。頁面出現軸帶時，軸帶仍要過 `P0-OVERLAP-AXIS-STACK` | B 的新聞頁；`VP-360` 與 `VP-1280`；兩主題 |
| `P0-LEARN-STACK` | 開蒙不繼承軸的重疊 | `/learn/` 的門、鎖狀態、列表與版頭兩兩不相交；標題與主連結不被裁字；貼頂列不蓋住第一條目。開蒙若嵌入軸帶，軸帶項目照 P0 執行 | B；`VP-360` 與 `VP-1280`；兩主題 |
| `P0-CHRONICLE-PAGE` | 編年長頁的階段與模式卡不疊 | `/civilization/chronicle/` 上，階段標題、封面、模式卡（`.pattern-card`）、頁內模式導航兩兩不相交；錨點跳轉後標題在貼頂列之下；紙卡文字對比達標；無整頁橫向滾動 | B；`VP-360`、`VP-768`、`VP-1280`；兩主題 |

### 2.4 P1 應修

P1 不計入 Critical 數目。未依第 4 節豁免的 P1 仍不得上線。

| ID | 項目 | FAIL 條件 | 覆蓋 |
| --- | --- | --- | --- |
| `P1-NODE-CROWD` | 六個軸節點在窄屏仍可分辨 | `.milestones` 六點（地球、起源、技術、城市、今天、未來）有標籤盒相交、標籤寬被壓成省略號中間、或「今天／切片」的白點與鄰點中心距 < 24px。允許標籤換行，不允許兩個標籤疊字 | A；`VP-360` 與 `VP-LAND`；暗色 |
| `P1-SLIM-HEIGHT` | 首頁瘦軸不靠裁切來變矮 | ≤720px 的 `.axis-hero.axis-slim`（`max-height: 300px`）把標題、導語首字、任一軸節點或 CTA 裁出盒子。導語兩行截斷可以留下完整詞；截到半個字或截掉 CTA，FAIL | 只限 `/`；`VP-360` 與 `VP-390`；兩主題 |
| `P1-ANCHOR-OFFSET` | `--civ-anchor-offset` 蓋得住真的貼頂列 | 貼頂列實高（含換行後的晶片與行情列）大於 220px，而哈希滾動仍用 220px，導致標題鑽進貼頂列。量到實高超過 token 即 FAIL | B；`VP-360`（貼頂列最高的寬度） |
| `P1-FOCUS-RING` | 鍵盤焦點看得見 | 主控 `:focus-visible` 沒有對比達標的焦點環，或焦點順序跳進被遮住的圓點。用 Tab 從字標走到「跳到今日切片」再走到第一個編年圓點，焦點環被鄰層蓋住即 FAIL | A；`VP-1280`；淺色與暗色 |
| `P1-REDUCED-MOTION` | 減少動態時層不會再靠動畫疊上 | `prefers-reduced-motion: reduce` 時，軸、圓點、揭曉、字標圓點仍有位移或縮放，且動畫過程中兩塊主內容相交。靜止重疊已由 P0 抓住；此條只抓動畫把分離的層暫時疊在一起 | A；`VP-390`；暗色 |
| `P1-MORE-MENU` | 「更多」選單留在視窗內 | `.civ-more` 打開後選單超出視窗、被 `overflow: hidden` 裁掉、或蓋住「跳到今日切片」。選單寬度用 `min(320px, 80vw)` 時，在 360px 寬上仍須四邊都在視窗內至少 8px | B；`VP-360`；淺色 |
| `P1-SAFE-AREA` | 瀏海與底部手勢條不吃字 | 實機或模擬安全區時，字標、第一列晶片、固定的回到頂部與系統手勢條相交。截圖若只在瀏覽器外框內裁字、網頁座標正常，改記此條而不記 `P0-CLIP-GLYPH` | A；`VP-390` 實機或帶安全區的模擬；暗色 |
| `P1-LANG-WRAP` | 語言切換不把軸擠爆 | 切到另一語言後，字標、主欄目、CTA 出現裁字、相交或整頁橫向滾動 | A；`VP-360`；暗色 |
| `P1-CLS-AXIS` | 軸帶圖片進來時不推動 CTA 去撞圓點 | 軸背景或編年封面載入前後，CTA 與編年圓點的盒子間距變化超過 8px，或載入結束後從不相交變成相交。相交本身同時記 P0 | A；`VP-390`；淺色。用慢速網路看一次 |
| `P1-AD-HOLD` | 凍結期間廣告不插入軸帶 | 審查凍結未解除時，首頁、文明頁、新聞頁出現廣告框、錨點廣告或插頁，並與軸、CTA、圓點、標題相交或把內容往下推超過一屏。凍結解除後的重大更新改走 `GATE-ADS`，廣告框仍不得與 A 集合的主控相交 | B；`VP-360` 與 `VP-1280` |
| `P1-EMPTY-MEDIA` | 缺圖不留空框，也不把版面壓扁到重疊 | 封面失敗時紙印還在，但相鄰標題、按鈕、圓點因此相交或被裁。空的破圖圖示佔住超過 48px 高的空洞，FAIL | C 的起源、科技、城市、編年；`VP-360`；淺色 |
| `P1-TABLET-GAP` | 平板不是放大的手機重疊 | `VP-768` 上六點軸、CTA、編年軌之間間距 < 8px，或負 margin 讓軸帶貼死螢幕邊緣把第一個字裁掉 | A+編年；`VP-768`；兩主題 |

### 2.5 P2 建議

P2 不擋上線。記入合併閘的備註，下一輪重大更新再看。

| ID | 項目 | FAIL 條件（建議，不擋） | 覆蓋 |
| --- | --- | --- | --- |
| `P2-TYPE-RAMP` | 軸標題字級在窄屏仍像標題 | `VP-360` 上 `.axis-title` 計算字級 < 24px，或與導語字級差 < 4px | A；`VP-360` |
| `P2-SCROLLBAR-AFFORD` | 橫滑軌讓人知道還有下一個 | 編年圓點或模式軌可橫滑，但軌上沒有裁切提示（下一個圓點露出至少 8px，或軌端有餘量）。完全看不出能滑，記此條 | A；`VP-360` |
| `P2-LANDSCAPE` | 橫向手機軸仍單行可讀 | `VP-LAND` 上節點標籤相交或 CTA 掉到圓點上。若已構成 P0 重疊，改記 P0，不重複計 P2 | A；`VP-LAND` |
| `P2-404-BRAND` | 404 與離線頁品牌一致 | `public/404.html`、`public/offline.html` 的可見站名不是「文明編年史」，或墨／紙關係與主站相反到對比不足 | 這兩頁；`VP-360` 與 `VP-1280` |
| `P2-FOCUS-SKIP` | 跳過連結能落到主內容 | 鍵盤第一次 Tab 看不到跳過連結，或它落在被裁切的軸標題上 | `/`；`VP-1280` |
| `P2-PRINT` | 列印不把固定層印在正文上 | 列印預覽裡貼頂列或固定鈕蓋住標題 | `/civilization/chronicle/` 列印預覽 |

---

## 3. 視覺與佈局陷阱

這一節是對着 2026-10-20 那張手機截圖寫的。截圖裡每一處都對得上前表的一條 FAIL。以後的重大更新用同一套陷阱重看，不靠記憶。

截圖現場（暗色，文明總覽首屏）：

| 畫面 | 應有 | 對上的 ID |
| --- | --- | --- |
| 版頭只見「年史」 | 完整「文明編年史」 | `P0-BRAND-WORDMARK`、`P0-CLIP-GLYPH` |
| 主欄目左緣只見「年」，其後才是今天、開蒙、更多、訂閱 | 完整「文明」「編年」 | `P0-CLIP-GLYPH`、`P0-HSCROLL-COLLIDE` |
| 標題左緣是「一條很長的時間軸上」 | 「站在一條很長的時間軸上」 | `P0-CLIP-GLYPH` |
| 導語左緣從「到今天，再望向未來」起 | 「軸由宇宙走到今天，再望向未來……」 | `P0-CLIP-GLYPH` |
| 銅金短鈕只見「起源」，壓在軸標籤上 | 整句「閱讀人類起源」，位於軸的下方、與節點不相交 | `P0-OVERLAP-AXIS-STACK`、`P0-CTA-TARGET` |
| 「跳到今日切片」壓住圓點 02–06 | 按鈕在圓點帶之上或之下，中間有空隙，圓點名稱可讀 | `P0-OVERLAP-AXIS-STACK`、`P0-Z-STACK`、`P0-TOUCH-44` |
| 模式卡與案例晶片疊成兩列，左緣切字 | 每個晶片完整，列與列、列與圓點不相交 | `P0-OVERLAP-AXIS-STACK`、`P0-HSCROLL-COLLIDE` |

八個陷阱。每項都寫「看哪裡」和「怎樣算沒抓到」。

### 3.1 重疊

看 `.axis-hero` 內部由上到下應是：眉題、標題、導語、深時間軸、CTA、編年圓點、模式軌、案例軌。首頁則是英雄區結束後才接時鐘、編年帶、模式與案例軌。兩套都用第 2.2 節的腳本。腳本回傳非空就是 FAIL。肉眼要特別看「跳到今日切片」的盒子是否碰到任何 `.stage-dot`，以及「閱讀人類起源」是否碰到節點「起源」。

沒抓到的量法：只截一張滾動後的中段、沒有同時框住軸與圓點；或只看桌面。

### 3.2 裁字

對字標、標題、導語、每個 CTA、每個晶片跑 `clipped()`。另外用肉眼讀第一個字與最後一個字。標題必須以「站」開頭，導語必須以「軸」開頭，總覽主按鈕必須以「閱」開頭並以「源」結尾。

沒抓到的量法：把 `overflow: hidden` 當成整齊；只量元素自己的 `scrollWidth`，不量祖先的裁切邊。

### 3.3 整頁 overflow 與負 margin

`.page` 兩側留白約 16px，軸帶用 `-16px` 貼邊。貼邊可以，第一個字不可以出視窗。`scrollWidth` 與 `clipped()` 一起看。橫向只滑得動「內部軌」，滑不動整份 `body`。

沒抓到的量法：在已橫移的頁面上截圖，把裁掉的左緣當成設計對齊。

### 3.4 z-index 與絕對定位

軸軌 `.deep-axis .rail` 是絕對定位的 2px 線，圓點可以壓住這條線。線以外的絕對層（暗角、選單、回到頂部、任何新的裝飾）不得壓住文字或按鈕。`.axis-hero > :not(.axis-vignette)` 都是 `z-index: 1`，所以英雄區裡後出現的 CTA 與先出現的軸若被拉進同一塊盒，會直接疊字。檢測看盒子相交，不看 z-index 數字相不相同。

沒抓到的量法：只檢查計算樣式裡的 `z-index`，不看畫面上的盒子。

### 3.5 貼頂列與固定 CTA

`.chrome` 貼頂，`z-index: 20`。回到頂部固定在右下。檢測時要做三個動作：點「跳到今日切片」、點一個編年圓點、把頁面滾到固定鈕附近。三個落點的標題與主控都不得被遮住。

沒抓到的量法：只拍首屏靜止圖，不點 CTA。

### 3.6 橫滑與其他層互撞

≤720px 時 `.pattern-axis` 與 `.case-axis` 改為換行且 `overflow: visible`。父層若仍是 `overflow: hidden`（`.axis-hero` 本身，或首頁瘦軸的 `max-height`），換行的晶片會被裁、或畫進編年圓點。檢測時把模式軌與案例軌的每一個晶片都納入相交測試，並用手指把編年軌從 01 滑到 10。

沒抓到的量法：只看預設捲動位置；晶片被切在左緣時換一句「使用者可以滑回來」。

### 3.7 觸控目標

主控 < 44px 即 `P0-TOUCH-44`。截圖裡的失敗比 36px 更嚴重：按鈕與圓點的可點區域已經重疊，點下去會點錯物件。先過重疊，再量尺寸。尺寸達標但兩盒相交，仍然是 P0 重疊。

沒抓到的量法：只量 CSS `min-height`，不量實際盒子；或把 14px 的軸圓點當成整個連結。

### 3.8 暗色對比與品牌字樣

暗色截圖的墨底上，紙色晶片是淺底深字。若有晶片變成深底深字或淺底淺字，對比條目失敗。品牌字樣以畫面為準：讀者要在不橫滑的首屏看見「文明編年史」五個字。位址列可以截短，版頭不可以。

沒抓到的量法：用色票對 `#161c24` 計算，忽略軸上那張有明暗的背景圖。

---

## 4. 過關規則建議

本節是給 GM 合併時用的規則提案。Grok 4.7 這一席沒有上線簽字權。

### 4.1 席次與票

| 席 | 人 |
| --- | --- |
| 檢測席 | Kimi K3、Grok 4.7、GLM 5.3。各交一份獨立清單，各對合併後的唯一清單投 PASS 或 FAIL |
| 合併與上線簽字 | GM（PP O）。只簽合併閘 |

放行要同時滿足：

1. 三席都交了清單。缺一席，不得用剩下的票數折成過關。
2. 三席之中至少兩席對合併清單投 PASS。
3. Critical 計數 = 0。
4. 第 4.3 節的證據齊全。
5. GM 在合併閘上簽字。

票不能改寫 Critical。任何一席用截圖指出一條 P0，合併清單就記入 Critical，直到新的截圖顯示該條在同一頁、同一視窗、同一主題消失。一席 FAIL 且附上 P0 截圖時，整閘 FAIL，另外兩席的 PASS 不覆蓋它。

三席都 PASS 而 Critical 仍大於 0，結果是 FAIL。兩席 PASS、一席棄權，結果是未過關。

### 4.2 P0、P1、P2

| 級 | 合併後 | 可否豁免 |
| --- | --- | --- |
| P0 | Critical。計數必須為 0 | 不可。不設「已知問題先上」 |
| P1 | 不計入 Critical。未處理則不得上 | 可以。GM 在合併閘寫明頁面、視窗、主題、原因，以及補做落在哪一次之後的重大更新。豁免過期條件是「下一次走本閘的部署」。空的日曆不構成豁免 |
| P2 | 不擋 | 不需要豁免。留在合併閘備註 |

同一畫面同時觸發 P0 與 P1 時，只升級為 P0，不另計一條 P1。

### 4.3 必要截圖

每張圖檔名：`{日期}-{頁簡稱}-{視窗}-{主題}-{項目ID}.png`。例：`2026-10-20-civ-360-dark-P0-OVERLAP-AXIS-STACK.png`。頁簡稱用 `home`、`civ`、`chronicle`、`learn`、`slice`、`news`。

通過也要有圖。寫「已看過」而不附圖，該條視為未測，整閘不得 PASS。

最低證據包（缺一張即未過關）：

| # | 畫面 | 目的 |
| --- | --- | --- |
| 1–4 | `/civilization/`，`VP-360` 與 `VP-390`，淺色與暗色，各一張首屏 | 同一張圖裡要同時看見軸、兩顆 CTA、編年圓點、模式卡與案例晶片。這是事故同框 |
| 5–8 | `/`，同樣四個組合 | 瘦軸與區外的編年帶、模式軌 |
| 9 | `/civilization/`，`VP-360`，暗色，點「跳到今日切片」之後的落點 | `P0-CTA-TARGET`、`P0-STICKY-FIXED` |
| 10 | `/civilization/chronicle/`，`VP-360`，暗色，含一張模式卡 | `P0-CHRONICLE-PAGE` |
| 11 | `/learn/`，`VP-360`，暗色，首屏 | `P0-LEARN-STACK` |
| 12–13 | 一則新聞頁，`VP-360` 暗色與 `VP-1280` 淺色 | `P0-NEWS-CHROME` |
| 14–15 | `/civilization/`，`VP-768`，淺色與暗色 | 平板 |
| 16–17 | `/` 與 `/civilization/`，`VP-1280`，淺色 | 桌面 |
| 18 | 版頭特寫，`VP-360`，暗色，字標五字完整 | `P0-BRAND-WORDMARK` |

相交距離少於 8px 的兩層，加一張帶盒子邊線的開發者工具圖，或在證據表寫下四邊座標。P0 失敗時，除了上表，再附一張只框住失敗區域的近拍。

證據表欄位：ID、頁、視窗、主題、結果（PASS／FAIL／N/A）、檔名、檢測席。

### 4.4 簽字

| 誰 | 簽什麼 |
| --- | --- |
| Grok 4.7 | 只簽本檔。聲明：2026-10-20 獨立初稿，未讀另外兩席清單，未對生產站作部署許可 |
| Kimi K3、GLM 5.3 | 各簽自己的清單 |
| GM（PP O） | 簽合併後的唯一上線閘。簽名表示 Critical = 0、至少兩席 PASS、第 4.3 節證據已核對 |

沒有 GM 簽字的部署，視同未過閘。模型清單、對話記錄、單一席的 PASS，都不是部署許可。

### 4.5 本席這次的票

本檔是清單，不是對當前生產站的放行票。對 2026-10-20 那張文明總覽手機截圖，本席的判定是 FAIL：`P0-OVERLAP-AXIS-STACK`、`P0-CLIP-GLYPH`、`P0-BRAND-WORDMARK` 已成立。在新的同框截圖證明這三條消失之前，本席對「現況可上線」投 FAIL。

---

## 附錄 A. jd-tech-landing

適用站：`jainaspp.github.io/jd-tech-landing`。同源的是閘的精神，不是文明編年史的版面。

直接沿用：

- 第 1 節的觸發與免閘。全域 CSS、導航、首屏、動畫系統、路由結構走全閘。錯字、單篇、單筆資料針免閘。拿不準就走全閘。
- `P0-OVERLAP-AXIS-STACK` 的量法，對象改成該站首屏的主標題、主 CTA、任何橫向圓點或卡片列、任何絕對定位的裝飾層。
- `P0-CLIP-GLYPH`、`P0-OVERFLOW-X`、`P0-Z-STACK`、`P0-STICKY-FIXED`、`P0-HSCROLL-COLLIDE`、`P0-TOUCH-44`、`P0-CONTRAST-INK` 的門檻與量法。
- 第 4 節：兩席以上 PASS、Critical = 0、缺席不算過、P0 不可豁免、P1 須 GM 寫明豁免、截圖檔名規則。該落地頁若只有一次人工審、沒有三席，仍須 Critical = 0 與同組截圖，簽字人改為該站的 GM。

不要照搬：

- 字樣「文明編年史」。改查該站自己的完整品牌名，截斷即 FAIL。
- 墨 `#161c24` 與紙 `#f7f1e6` 不作為該站必達色。對比門檻仍是 4.5:1 與 3:1，量實際像素。
- 文明軸六節點、編年圓點、模式卡與案例晶片的文案與選擇器。該站沒有這些元件就記 N/A，不要求做出一條時間軸。

該站每次全閘最少四張圖：首頁 `VP-360` 淺色與暗色（或該站唯一主題的兩次首屏，含主 CTA）、首頁 `VP-1280`、手機導航打開、最長滾動段的頁尾與固定鈕。主 CTA 必須點一次，確認落點不被貼頂列遮住。

---

## 附錄 B. 本席簽字

| 欄位 | 內容 |
| --- | --- |
| 檢測席 | Grok 4.7 |
| 日期 | 2026-10-20 |
| 簽的文件 | `docs/gates/SITE-REVIEW-CHECKLIST-GROK-47-2026-10-20.md` |
| 對現況截圖 | FAIL（見第 4.5 節） |
| 部署許可 | 無。上線只認 GM 簽過的合併閘 |
