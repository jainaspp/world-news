# 站級重大更新閘（正典）

- 狀態：**LOCKED 2026-10-20 by GM after three-model input**
- 來源 PR：[#180](https://github.com/jainaspp/world-news/pull/180)（Kimi K3）、[#181](https://github.com/jainaspp/world-news/pull/181)（GLM 5.3）、[#182](https://github.com/jainaspp/world-news/pull/182)（Grok 4.7）
- 文件 ID：`SITE-MAJOR-UPDATE-GATE`
- 適用站：[world-news.xyz](https://world-news.xyz)（本倉 `jainaspp/world-news`）
- 顯示品牌：文明編年史
- 墨色 `#161c24`（軸帶、`.axis-hero`、`.chronicle-band`）；紙感 `#f7f1e6`；暗色頁底可為 `#0E141C`；輔色銅金 `#c4a572`／`#9a7b4f`（飾線、軸軌、主按鈕，不是第二套頁底）
- 輸入清單（保留，不再各自當上線閘）：
  - `docs/gates/SITE-REVIEW-CHECKLIST-KIMI-K3-2026-10-20.md`
  - `docs/gates/SITE-REVIEW-CHECKLIST-GLM-53-2026-10-20.md`
  - `docs/gates/SITE-REVIEW-CHECKLIST-GROK-47-2026-10-20.md`
- 開場 Hero 席審（索引，不改本閘條文、不是上線簽字）：`docs/gates/BBT-HERO-REVIEW-GLM-5.3-2026-10-22.md`
- 事故樣本：`civ-mobile-broken-2026-10-20.jpg`。手機文明 hub 暗色首屏：軸、編年圓點、「跳到今日切片」、模式卡／案例晶片疊在同一帶，左緣裁字，品牌不完整，觸控目標小於 44px。內容審過、沒有視覺閘，仍然上線。
- 性質：只定檢測與過關。不改 app、不改 CSS、不改 runtime、不改文明文案、不開新產品線。

自本文件鎖定起，world-news.xyz 的重大更新只認這一份。三席對**本清單**投票。任一席自己的清單、對話紀錄或單獨 PASS，都不是部署許可。

本文件是閘，不是對 2026-10-20 生產站的放行。該日截圖已同時命中多條 P0（重疊、裁字、品牌、橫向溢流、觸控）。新的同框證據證明 Critical＝0 之前，GM 不得依本閘簽字上線。

## 合併口徑

三份清單不一致時，採用較嚴的那一條：

1. P0 取聯集。只要有一席列為 P0，正典就列 P0。Grok 4.7 把每一條 P0 計為 Critical；正典維持 Critical。
2. 同一缺陷一席寫 P0、另一席寫 P1 或 P2 時，升為 P0，不另計一條較低等級。
3. 閾值取較嚴者（重疊超過 1px 即失敗；觸控同時適用 44px 盒、中心距 44px、邊緣間距 8px）。
4. 覆蓋面取較寬者（頁面、視口、亮暗、必須點擊、真機）。
5. 免閘只留三席都允許、且本閘點名的四類。
6. 過關票數鎖定為 3/3。P0 不可由投票或 GM 豁免。上線簽字只有 GM。

---

## 執行卡

合併或部署前，把下列證據附在 PR。缺一項就停。全站閘只靠本卡、沒有第 7.3 節其餘證據，不得判 PASS。

1. **手機全長截圖**：寬 ≤640。至少 H（`/`）與 C（`/civilization/`）。整頁全長，不得只截首屏。淺色與暗色各一。同一張圖要同時看見軸、主 CTA、編年圓點、模式卡與案例晶片。
2. **零重疊**：軸、編年圓點、「跳到今日切片」、模式卡、案例晶片，彼此不相交。相交超過 1px 即失敗。父子包含、以及圓點壓住 2px 軸軌，不算。
3. **品牌「文明編年史」**：五字完整、可讀、無簡體（例如不得寫成「编年史」）、無裁切、無破圖。位址列可以截短，版頭不可以。
4. **無橫向溢出**：整頁沒有橫向捲軸。`document.documentElement.scrollWidth` 不得大於 `clientWidth + 1`。軸軌等內部橫滑可以存在，不得把 `body` 帶著左右晃。
5. **CI**：全站閘與免閘都要 CI 綠。免閘另附一張符合第 1–4 點的手機 smoke 全長截圖（至少首頁）。

檔名至少含日期、頁、視口寬、主題。例：`2026-10-20-civ-360-dark-full.png`。

---

## 1. 重大更新觸發

### 1.1 總則

以渲染結果為準，不以改動行數或檔案數為準。會改變任何頁面在任何視口下的像素、層疊、捲動或互動路徑，即為候選重大更新。命中第 1.2 節任一條，就是全站閘。拿不準，走全站閘。GM 不把邊界案例降成免閘。

### 1.2 全站閘（FULL GATE）

| ID | 觸發條件 |
| --- | --- |
| `TRIG-HOME` | 首頁 `/` 的版面、區塊順序、首屏、masthead、`.chrome`、`.civ-nav`、`.axis-hero`、`.chronicle-band`、`.axis-rails`、`.today-slice`、`#slice` 的掛載或今日落點 |
| `TRIG-CIV` | 文明 hub `/civilization/`、編年 `/civilization/chronicle/` 的結構；深時間軸（`.deep-axis`、`.milestones`、`.axis-node`）、軸上 CTA、編年帶與圓點、模式軌、案例軌、今日釘、切片卡；新的文明或編年厚頁 |
| `TRIG-GLOBAL-CSS` | 全域樣式與 token：`src/App.css`、`public/columns.css`、`:root`、`html.dark` 的色、字級、間距階梯、`z-index`、`position`、`overflow`、負 margin、`max-height`、字體堆疊、media query |
| `TRIG-NAV` | 導航、頁首、頁尾、會跟著每一頁走的 chrome、品牌區塊、跳過連結、回到頂部、搜尋、主題、語言或繁簡、主欄目（文明、編年、今天、開蒙）、更多、訂閱、欄目晶片列 |
| `TRIG-ANIM` | 動畫與捲動系統：`--motion-*`、`.civ-reveal`、vignette、glow、scroll-snap、starmap、軸軌或圓點的過渡、`prefers-reduced-motion`、sticky／fixed、IntersectionObserver、ResizeObserver |
| `TRIG-ROUTE` | 路由、URL、重新導向、錨點（含 `#slice`、`#stage-N-*`）、canonical、首頁與欄目的 HTML 殼、`functions/civilization` 的 `PAGES` 鍵 |
| `TRIG-TEMPLATE` | 共用模板產出的 HTML 結構（`shared/civilizationPage`、`homeTemplate`、新聞頁模板等） |
| `TRIG-ASSET` | 品牌 logo、字體檔、全站共用圖像、favicon、og-image；換圖時若同時改了 `object-fit`、`aspect-ratio`、英雄區高度或 `overflow`，同樣計入 |
| `TRIG-LAYOUT-JS` | runtime 改變版面的 JS：廣告槽、骨架屏、延遲掛載、主題切換 |
| `TRIG-VIEWPORT` | viewport meta、安全區（`env(safe-area-inset-*)`）、`100vh`／`100dvh` |
| `TRIG-BRAND` | 讀者看得見的「文明編年史」，或墨 `#161c24`、紙 `#f7f1e6` 的實際塗色 |
| `TRIG-ADS` | 解除廣告凍結，或在頁面插入廣告、錨點廣告、插頁廣告的 DOM |
| `TRIG-STICKY` | 固定或黏性層（CTA、banner、返回頂部）的位置或行為 |

### 1.3 一律全站閘的邊界

| 情況 | 判定 |
| --- | --- |
| 只改一頁文案，但動到 chrome、footer、軸帶、晶片或 DOM 順序 | 全站閘 |
| 首頁把編年帶、模式軌拆出 `.axis-hero`，或總覽把它們放回英雄區 | 全站閘。這兩套 DOM 是 2026-10-20 事故的兩個現場 |
| 只改 ≤720px 的 `overflow`、`position`、負 margin、`max-height` | 全站閘 |
| 順手改了 CSS、class、共用選擇器或模板 | 全站閘。不得歸進免閘 |
| 會改變畫面或互動的前端套件升級 | 全站閘 |
| 純後端、鎖檔、同尺寸換圖、讀者看不到的註釋或測試、文明編年的純文字增補、成批換 feed | 三席沒有共同列為免閘，走全站閘 |

### 1.4 免閘（SKIP GATE）

只限下表。四類都必須同時滿足：不動模板、不動 class、不動 CSS、不動 DOM 順序、不動共用 chrome。碰到第 1.2 節任何一條，整次變更改判全站閘。

| ID | 可以免全站閘的範圍 |
| --- | --- |
| `SKIP-TYPO` | 單篇已發布正文裡的錯字、標點、空格、譯名 |
| `SKIP-SINGLE-POST` | 單篇新聞、導讀、懶人包、分析或週報的正文新增、替換或下架。走既有模板，不新增版面元件 |
| `SKIP-DATA-PIN` | 單則資料針：一則 RSS 標題、一則當年今日、一個 KV 欄位、排序權重、置頂旗標或數字。不動列表元件的結構與樣式，不動卡結構 |
| `SKIP-META` | 單頁不外顯的 description、關鍵字。`<title>`、og、canonical、可見品牌字樣一有改動，改走全站閘 |

免閘仍須 CI 綠，並在 PR 附一張執行卡第 1–4 點的手機 smoke 全長截圖（至少首頁）。免閘不是免檢。

---

## 2. 覆蓋面與量測

### 2.1 視口

CSS 像素，直向為主。寬度分界三份清單不完全相同：641–1024 都要測到，1024 單獨留樣，避免落在空檔。

| 代號 | 定義 | 正典必測尺寸 |
| --- | --- | --- |
| `M` | 寬 ≤640 | 360×800、390×844、414 寬。含 iOS Safari 網址列展開與收合。基準全長須蓋過 780 高的首屏 |
| `T` | 寬 641–1024 | 768×1024。H 與 C 另在寬 1024 留一張 |
| `D` | 寬 ≥1024 | 1280×800 與 1440×900 都要 |
| `VP-LAND` | 手機橫向 | 640×360。只用於標了橫向的項目 |

### 2.2 頁面

| 代號 | 頁 | 路由 |
| --- | --- | --- |
| `H` | 首頁 | `/` |
| `C` | 文明 hub／總覽 | `/civilization/` |
| `N` | 編年 | `/civilization/chronicle/` |
| `L` | 開蒙 | `/learn/` |
| `S` | 今日切片 | `/#slice`，以及文明頁今日釘 |
| `A` | 新聞頁 | 當日最長標題一篇，加一篇一般稿。`/briefing/…`、`/explainer/…`、`/story/…`、topic、category、region、`/major` 中當日有正文者 |

| 集合 | 範圍 | 何時必跑 |
| --- | --- | --- |
| 事故帶 | `H`、`C` | 每一次全站閘。兩套 DOM 都跑 |
| 必測 | 事故帶加上 `N`、`L`、`S`、`A` | 每一次全站閘 |
| 抽測 | `/civilization/cosmos/`、`/earth/`、`/origins/`、`/tech/`、`/city/`、`/today/`、`/major/`、有資料之日的 `/on-this-day/`、`/404`、離線頁 | `TRIG-GLOBAL-CSS`、`TRIG-NAV`、`TRIG-CIV`、`TRIG-ROUTE`、`TRIG-BRAND`、`TRIG-ADS` |

覆蓋欄寫「全」：M、T、D × H、C、N、L、S、A × 淺色與暗色，且 M 含 360、390、414。

元件本來不該出現在該頁（新聞頁沒有深時間軸）：證據表寫 `N/A`。該頁應該有、DOM 卻消失：`FAIL`。

`H` 必須同時有軸、`.axis-cta`、`.chronicle-band`、`.axis-rails`（內含模式軌與案例軌）、`#slice`。`C` 必須同時有 `.axis-title`、`.deep-axis`、`.axis-cta`、`.chronicle-strip`、`.pattern-axis`、`.case-axis`。

首頁用 `.axis-hero.axis-slim`：編年與模式軌在英雄區外；≤720px 有 `max-height: 300px` 與 `overflow: hidden`。總覽把編年帶與兩條晶片軌放在同一個 `.axis-hero` 裡。兩套都測。事故截圖是總覽這一組。

### 2.3 主題

淺色與 `html.dark`。暗色頁底可以是 `#0E141C`；軸帶與編年帶仍須是墨 `#161c24`。淺色紙卡是 `#f7f1e6` 上的 `#161c24`。

### 2.4 量測

在目標視窗、目標主題打開頁面。下列片段只讀幾何，不改頁面。

重疊：回傳的每一對都是 FAIL。允許 1px 抗鋸齒。父子包含略過。

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

再掃一輪按鈕、連結、輸入與文字節點。相交超過 1px、又不是父子、也不是「圓點壓住 2px 軸軌」者，同樣 FAIL。

裁字：視窗或 `overflow` 不是 `visible` 的祖先切到元素邊框，即 FAIL。`overflow: hidden` 把字藏起來，仍算裁字。

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

整頁橫向滾動：`document.documentElement.scrollWidth > document.documentElement.clientWidth + 1` 即 FAIL。另以 `document.scrollingElement.scrollWidth > window.innerWidth + 1` 覆核。內部橫滑（編年圓點軌、晶片列）可以存在，條件見 `P0-HSCROLL-COLLIDE`。

固定寬度：DevTools 找出 `scrollWidth > clientWidth` 的元素，把選擇器路徑寫進證據。

觸控盒：`getBoundingClientRect()` 的寬與高都要 ≥ 44。量整顆可點盒（含文字標籤），不量 CSS `min-height`，不把 14px 圓點當成整顆連結。正文裡的行內文字連結不量。

對比：量實際像素（含軸上照片與暗角），不要只拿 token 對 token。正文與按鈕字 < 4.5:1 為 FAIL。字級 ≥ 24px、或粗體 ≥ 18.66px 的大字 < 3:1 為 FAIL。

---

## 3. P0 必殺

任一 P0 在其覆蓋面上 FAIL，整閘失敗，Critical 不為 0。P0 不可豁免，不可「已知問題先上」。

允許的重疊只有兩種：父子包含；圓點壓住軸軌那條 2px 線。不設「設計性層疊」豁免。

| ID | 項目 | FAIL 條件（任一成立） | 覆蓋 |
| --- | --- | --- | --- |
| `P0-OVERLAP` | 主層零重疊 | 文字或互動元素的盒子相交超過 1px。軸、編年圓點、CTA、模式卡、案例晶片、導航、卡片、裝飾層之間非允許相交。`.axis-title`、`.axis-lede`、`.deep-axis`、`.axis-cta`、`.chronicle-strip` 或首頁 `.chronicle-band`、`.pattern-axis`、`.case-axis`、`.civ-nav`、`.chrome` 之中任何兩個沒有包含關係的盒子相交超過 1px。廣告框與上述主控相交。固定 CTA 與黏性 CTA 同屏雙重覆蓋 | 全。H、C、S 為重災區 |
| `P0-CLIP` | 可讀字不被視窗或 overflow 切開 | 字標、主欄目、h1、`.axis-title`、`.axis-lede`、`.axis-node` 的 `.lab`／`.yr`、`.axis-cta`、`.stage-dot .name`、`.pattern-axis .chip`、`.case-axis .chip`、pill、圓點標籤，任一 `clipped()` 為真，或肉眼可見半個字。品牌、標題、CTA、晶片、圓點名、主欄目不得以省略號放行。≤720px 的 `.axis-hero.axis-slim`（`max-height: 300px`）把標題、導語首字、任一軸節點或 CTA 裁出盒子。編年 01 號或最後一號圓／卡不可見或被裁。各行裁切量可以不同，不得用「整頁有沒有同一位移」放行。開蒙與新聞頁改量該頁 h1、主按鈕、導航晶片。導語可以兩行截成完整的詞；截到半個字即 FAIL | 全。M 與當日最長標題、最長 pill 必測 |
| `P0-HSCROLL` | 頁面本身不橫向滾動 | `scrollWidth` 比 `clientWidth` 或 `innerWidth` 大超過 1px。body 出現橫向捲軸。整頁可用雙指或滑鼠水平拖動（刻意設計的單列橫滑容器本身除外）。負 margin（`.axis-hero`、`.chronicle-band`、`.bulletin-clock` 的 −16px）把內容推出視窗。`overflow: hidden` 只是把溢出藏住、元素仍然 `clipped()` | 全 |
| `P0-HSCROLL-COLLIDE` | 橫滑軌不撞其他層，也不劫走直滑 | `.chronicle-track`、`.chrome .chip-scroller`、`.pattern-axis`、`.case-axis` 可以橫滑。FAIL 若：橫滑軌與另一主區塊相交；滑動中晶片畫進貼頂列、CTA 或圓點；停住時晶片被切成半個字（軌的內緣 padding 裡必須是完整晶片）；≤720px 的 `flex-wrap: wrap` 加上父層 `overflow: hidden`，使晶片疊進上一列或被裁；手指橫滑時頁面跟著左右晃；斜向或快速滑動時 `touch-action` 與巢狀捲動劫走頁面捲動或回彈卡死 | H、C 的 360 與 390，暗色必測。編年長頁的階段內模式卡另在 360 看一次，並把圓點軌從 01 滑到末顆 |
| `P0-FIXED-WIDTH` | 固定寬度不把頁面撐寬 | 內容容器的 `min-width` 大於當前視口，且沒有自帶橫滑殼。負向外距在 ≤640 造成頁面級橫向滾動。絕對定位元素把 `body` 撐寬。`<img>` 固有寬超過容器且無 CSS 夾寬，因而撐出橫向滾動 | M × 全部必測頁。T 必查 H、C、N、S |
| `P0-TOUCH-44` | 主控觸控盒與間距 | 可點盒的寬或高 < 44：版頭圖示（搜尋、主題、語言）、主欄目晶片、更多、訂閱、`.axis-cta a`、`.axis-node`、`.stage-dot`、`.pattern-axis .chip`、`.case-axis .chip`、關閉鈕。相鄰可點元素中心距 < 44px。相鄰可點元素邊緣間距 < 8px。現行若仍是按鈕 `min-height: 36px`、≤720px 版頭圖示 32px、編年圓點 40px、軸上圓點 14px，標籤沒有把整顆可點盒撐到 ≥ 44，就是 FAIL | M、T × 全部必測頁。360 必量。淺色與暗色 |
| `P0-CTA-COVER` | 貼頂列與固定層不吞內容 | 「跳到今日切片」或任何 sticky／fixed CTA 蓋住正文或其他互動元素，或被頁首、回到頂部、廣告槽蓋住以致不能點。點擊或雜湊落地後，目標標題沒有整段落在貼頂列下緣之下，間距 < 8px。任何 `position: fixed` 元件與主控盒子相交。頁內出現第二條黏住的編年軌。固定 CTA 與黏性 CTA 同屏疊用。貼頂列實高大於 `--civ-anchor-offset`，雜湊仍用較小的 offset。須真的點擊與滾動：頁中、頁尾、錨點直達、點 CTA、點一顆編年圓點、滾到回到頂部附近 | M、T、D × H、C、N、L、S。淺色與暗色 |
| `P0-CTA-TARGET` | 主 CTA 整句可見，並進得了目標 | 「跳到今日切片」不可見、不能點、文案不完整、點擊沒有落到 `#slice`，或點擊被圓點／模式卡吃掉。從 C 出發必須離開總覽並落在首頁切片。總覽主按鈕現行全文「閱讀人類起源」必須整句可見，並進入 `/civilization/origins/`。首頁主按鈕現行全文「打開文明總覽」必須整句可見，並進入 `/civilization/`。之後若改文案或路由，當次全站閘寫明新全文與新目標；口徑仍是整句可見、點得到、落點不被遮 | H、C。360 與 1280。淺色與暗色。必須點擊 |
| `P0-Z-STACK` | 層級不蓋字、不吃點擊 | 軸圖暗角（`.axis-vignette`）蓋住標題、節點、按鈕或圓點的字。`.axis-cta` 畫在 `.chronicle-strip` 或 `.stage-dot` 之上。裝飾性絕對層（軌線以外的暗角、星點、vignette）以 pointer-events 吃掉點擊，或在窄視口壓到正文。`.civ-more`、搜尋、主題、語言層被其他層蓋住、關不上，或蓋住它指向的項目以外的主按鈕。回到頂部蓋住主 CTA、編年圓點或模式卡。預期層級：暗角在內容下；`.chrome` 貼頂；主內容不壓另一塊主內容。檢測看盒子，不看 `z-index` 數字相不相同 | 全。360 與 1280 的暗色必測（軸圖最深的一段） |
| `P0-NAV` | 導航全程可用 | M 視口主導航換行溢出、被截、不可達，或要靠像素級瞄準才點得到。文明、編年、開蒙、今日任一晶片被裁。搜尋、主題、語言任一圖示不可見、被遮，或觸控盒不合格（併計 `P0-TOUCH-44`）。任一導航連結 404。品牌區塊沒有連回首頁 | 全。M × H 必測 |
| `P0-BRAND` | 品牌字樣「文明編年史」完整 | 版頭可見字樣不是完整的「文明編年史」（SVG 或 `.logo-word` 都算）。任一字被裁、被遮、斷行、只剩「年史」「史」或「文明」、被圓點或搜尋鈕蓋住。錯字或簡體（「编年史」）。logo 破圖，或與底色同色以致不可讀。`<title>`、og:site_name、頁首、頁尾、404、離線頁站名不一致，或出現其他站名。英文介面可以另有英文說明；版頭中文站名仍須完整，或由清晰的完整字標圖代替。不橫滑的首屏必須讀得到五個字 | 全。360 與 1280。淺色與暗色 |
| `P0-CONTRAST` | 對比達 WCAG AA | 在實際像素上（含軸圖與暗角）：正文或按鈕字 < 4.5:1，大字 < 3:1。`.axis-title`、`.axis-lede`、節點 `.lab`、CTA 字、編年名稱、紙色晶片上的 `#161c24` 低於門檻。銅金小字（`.kicker`、`.yr`）低於 4.5:1。暗色出現黑字壓黑底，或紙紋吃掉對比。至少覆核：墨底 `#161c24` 上的 `#c5c0b6` 軸字與 `#e8e4dc` 標題；紙底 `#f7f1e6`／`#f3f5f8` 上的 `#5c6570` meta 字 | 全。390 的暗色必量軸圖最亮的一段 |
| `P0-DARK-PAPER` | 暗色不把軸與紙卡混成一塊 | `html.dark` 下軸帶與編年帶不是墨底淺字。紙卡（今日落點、模式卡正文、層卡）不是紙底墨字，且對比不達標。軸上紙色晶片的字色跟墨底相同而消失。整頁被刷成另一套站的底色。淺色新聞區沒有保持冷灰、整頁鋪紙 | H、C、N、L、A。360 與 1280。暗色，並與淺色各留一張對照 |
| `P0-INK-TOKEN` | 墨色與紙感 token 沒有漏網 | 改動 token 之後，軸、CTA、模式卡、頁首、頁尾的 computed style 仍落在舊色，或亮暗混色。未改 token 的全站閘仍抽這五處 | 全 |
| `P0-AXIS-NODES` | 時間軸節點可讀、在軌、可點 | 任兩個軸節點標籤碰撞、重疊或擠到不可讀。六點（地球、起源、技術、城市、今天、未來）標籤盒相交，或標籤被壓成中間省略號。允許換行，不允許疊字。「今天／切片」白點與鄰點中心距 < 24px。節點圓點脫離金色軌線。節點不可點，或可點盒 < 44px（併計 `P0-TOUCH-44`） | M × H、C、N，含 `VP-LAND`。T、D 抽查。暗色必測 |
| `P0-ROUTE` | 路由與深鏈健全 | H、C、N、L、S、A 任一直連 404、白屏、ErrorBoundary，或 `#slice` 失效。觸發抽測集時，抽測頁或 404、離線頁白屏或站名錯誤，同樣 FAIL | 必測六頁直連。抽測條件見第 2.2 節 |
| `P0-DOM-EXPECT` | 應有骨架不得消失 | `H` 或 `C` 缺少第 2.2 節列出的必有元件 | 每一次全站閘的 H 與 C |
| `P0-RENDER-ERR` | 無阻斷性腳本錯誤 | 載入後 console 出現未捕捉 exception 或 unhandled rejection，並且任一區塊沒有渲染或互動失效 | 全 |
| `P0-NEWS-CHROME` | 新聞頁沿用同一版頭，且不自相覆蓋 | 所選新聞頁：字標不完整、主欄目不能點、標題被貼頂列遮住、整頁橫向滾動、主按鈕或圖示 < 44px、正文與固定鈕重疊。頁面若出現軸帶，軸帶仍要過 `P0-OVERLAP` | A。360 與 1280。淺色與暗色。兩篇都測（最長標題＋一般） |
| `P0-LEARN-STACK` | 開蒙不繼承軸的重疊 | `/learn/` 的門、鎖狀態、列表與版頭兩兩相交；標題或主連結被裁；貼頂列蓋住第一條目。開蒙若嵌入軸帶，軸帶項目照 P0 執行 | L。360 與 1280。淺色與暗色 |
| `P0-CHRONICLE-PAGE` | 編年長頁的階段與模式卡不疊 | `/civilization/chronicle/` 上，階段標題、封面、`.pattern-card`、頁內模式導航兩兩相交。錨點跳轉後標題不在貼頂列之下。紙卡對比不達標。整頁橫向滾動 | N。360、768、1280。淺色與暗色 |

---

## 4. P1 應修

P1 不計入 Critical 數目。未依第 7.2 節豁免的 P1，不得上線。同一畫面已計 P0 者，不另計 P1。

| ID | 項目 | FAIL 條件 | 覆蓋 |
| --- | --- | --- | --- |
| `P1-PERF` | 行動端效能 | M 視口、4G 節流下 LCP > 2.5s 或 INP > 200ms。首屏 hero 圖未壓縮或未設寬高 | M × H、C、A |
| `P1-CLS` | 版面穩定 | CLS > 0.1。字體 swap、骨架屏、廣告槽或延遲掛載造成可見位移。軸背景或編年封面載入前後，CTA 與編年圓點的間距變化超過 8px。載入後從不相交變成相交者，同時記 `P0-OVERLAP` | 全。軸帶項：H、C，390，淺色，慢速網路看一次 |
| `P1-MOTION` | 減動態與動畫 | 未遵從 `prefers-reduced-motion`。捲動動畫掉幀，或與 sticky 元素打架。`prefers-reduced-motion: reduce` 時，軸、圓點、揭曉或字標仍有位移或縮放，且動畫過程中兩塊主內容相交 | M、D × H、C、N。暫態重疊項：H、C，390，暗色 |
| `P1-IMG` | 圖像健全 | 缺 alt、破圖、寬高比塌陷、非首屏圖未 lazy 而拖慢 LCP | 全 |
| `P1-AD-HOLD` | 凍結期間廣告不插入軸帶 | 審查凍結未解除時，H、C、A 出現廣告框、錨點廣告或插頁，並把內容往下推超過一屏。與主控相交者改記 `P0-OVERLAP`。凍結解除後的重大更新走 `TRIG-ADS` | H、C、A。360 與 1280 |
| `P1-I18N` | 語言切換不把版面擠爆 | 切換語言後斷行溢出、按鈕爆框、英文長字衝出容器、整頁橫向滾動、主層相交，或雙語頁首高度不一致以致跳動 | 抽 H、C、A 雙語。H、C 的 360 暗色必測 |
| `P1-FONT` | 字體載入 | FOIT 超過 3s 仍無 fallback。serif 標題 fallback 後字寬差異造成換行，並壓到其他層（壓到則同時記 P0） | M、D × H、C |
| `P1-STICKY-XBROWSER` | sticky 在兩種手機瀏覽器上一致 | iOS Safari 與 Android Chrome 的 sticky／fixed 行為差異，導致 CTA 或頁首漂移、抖動或失效。三層以上黏性／固定層同時存在，但尚未蓋住主控 | M × H、C、S。須真機或雲端真機 |
| `P1-FOCUS` | 鍵盤與焦點 | Tab 順序跳躍、焦點環不可見或對比不達標、焦點被隱藏層吃掉。從字標 Tab 到「跳到今日切片」再走到第一個編年圓點，焦點環被鄰層蓋住 | D × 全部必測頁，淺色與暗色。H、C 的 1280 必走上述路徑 |
| `P1-META` | 中繼資料齊全 | 六頁任一 `<title>`、description、og 缺漏。可見品牌不一致改記 `P0-BRAND` | H、C、N、L、S、A |
| `P1-DARK-LEAK` | 暗色沒有殘留亮色塊 | 暗色下漏白、圖片白邊、紙紋層未切換、system 偏好切換後狀態錯亂。軸與紙卡混色改記 `P0-DARK-PAPER` | 全 |
| `P1-MIN-FONT` | 最小字級 | 任何非裝飾文字 < 12px | M × 全部必測頁 |
| `P1-MORE-MENU` | 「更多」選單留在視窗內 | `.civ-more` 打開後超出視窗、被 `overflow: hidden` 裁掉。360 寬上四邊距視窗不足 8px。蓋住「跳到今日切片」或關不上，改記 `P0-Z-STACK` | 必測頁。360。淺色 |
| `P1-SAFE-AREA` | 瀏海與底部手勢條不吃字 | 實機或帶安全區的模擬上，字標、第一列晶片、回到頂部與系統手勢條相交。網頁座標本身已裁字時改記 `P0-CLIP`，不降到本條 | H、C。390。暗色 |
| `P1-EMPTY-MEDIA` | 缺圖不留大空洞 | 封面失敗時，空的破圖圖示佔住超過 48px 高的空洞。相鄰標題、按鈕、圓點因此相交或被裁，改記對應 P0 | 抽測裡的起源、科技、城市、編年。360。淺色 |
| `P1-TABLET-GAP` | 平板不是放大的手機重疊 | 768 上六點軸、CTA、編年軌之間間距 < 8px，或負 margin 讓軸帶貼死螢幕邊緣。第一個字被裁改記 `P0-CLIP` | H、C、N。768。淺色與暗色 |

---

## 5. P2 建議

P2 不擋上線，不需豁免。記入本閘備註，下一次重大更新再看。已構成 P0 的，只記 P0。

| ID | 項目 | 建議的失敗觀察 | 覆蓋 |
| --- | --- | --- | --- |
| `P2-PRINT` | 列印與閱讀器 | 列印時軸、CTA 或導航蓋住正文；新聞頁或編年內文被截。閱讀器模式裡品牌或軸標題不成字 | D × A、N；編年列印預覽 |
| `P2-SWIPE-HINT` | 橫滑提示 | 編年圓點或模式軌可橫滑，但下一個圓點沒有露出至少 8px，軌端也沒有餘量，看不出能滑 | H、C。360 |
| `P2-SKELETON` | 骨架屏高度 | 骨架屏與實際卡片高度差 > 24px | M × H、A |
| `P2-SEO` | sitemap 與 feed | 新頁未入 sitemap。feed.xml 的「今天切片」未隨這次重大更新核對 | 站級 |
| `P2-A11Y-NAME` | 無障礙名稱 | 互動元素沒有可辨識名稱（aria-label 或可讀文字）。圓點只靠顏色區分狀態 | 全 |
| `P2-BACKTOP` | 回到頂部的間距 | 回到頂部與固定 CTA 距離 < 8px，或在小機上互相遮住邊角。真的蓋住主控改記 P0 | M × 全部必測頁 |
| `P2-OG-IMAGE` | 分享預覽圖 | og-image 沒有反映新的首屏主視覺 | H、C |
| `P2-TYPE-RAMP` | 軸標題仍像標題 | 360 上 `.axis-title` 計算字級 < 24px，或與導語字級差 < 4px | H、C。360 |
| `P2-FOCUS-SKIP` | 跳過連結 | 鍵盤第一次 Tab 看不到跳過連結，或它落在被裁切的軸標題上 | H。1280 |
| `P2-AXIS-DENSITY` | 窄屏軸的結構 | 窄屏仍用六點橫排，只能靠逐條打補丁維持 `P0-AXIS-NODES`。建議改為較少節點或直式軸 | 備註 |
| `P2-LANDSCAPE-STICKY` | 橫向短高的黏性層 | 高 < 420px 的橫向手機上，黏性層擠壓首屏。已構成 P0 者不重複計 | H、C。`VP-LAND` |
| `P2-AUTO-SCROLLWIDTH` | 把溢流斷言交給機器 | 建議把 `scrollWidth` 斷言放進現有 vitest，並加一張 360 基線截圖 diff。本項未做不擋上線 | 站級 |

---

## 6. 視覺陷阱

這一節專門攔住 2026-10-20 那張手機文明 hub。只截桌面、只截首屏、只看靜止圖、只核對 `z-index` 數字，都會漏。

| 畫面 | 應有 | 對上的 ID |
| --- | --- | --- |
| 版頭品牌不完整（清單分別記為只剩「年史」或只剩「史」） | 完整「文明編年史」 | `P0-BRAND`、`P0-CLIP` |
| 左緣整排被裁：字標、標題、導航、第一張卡、01 號圓、pill | 第一個字在視窗內 | `P0-CLIP`、`P0-HSCROLL`、`P0-FIXED-WIDTH` |
| 主欄目左緣只剩半個欄名 | 文明、編年、今天、開蒙完整 | `P0-CLIP`、`P0-NAV`、`P0-HSCROLL-COLLIDE` |
| 軸節點「今天」「未來」擠在一起 | 六點標籤分開、圓點在軌上 | `P0-AXIS-NODES`、`P0-OVERLAP` |
| 「跳到今日切片」壓住編年圓點 | 按鈕與圓點之間有空隙，圓點名稱可讀 | `P0-OVERLAP`、`P0-Z-STACK`、`P0-TOUCH-44` |
| 總覽主按鈕只露出「起源」，壓在軸標籤上 | 整句「閱讀人類起源」，與節點不相交 | `P0-OVERLAP`、`P0-CTA-TARGET`、`P0-CLIP` |
| 模式卡與案例晶片疊成多列，左緣切字 | 每個晶片完整，列與列、列與圓點不相交 | `P0-OVERLAP`、`P0-HSCROLL-COLLIDE`、`P0-CLIP` |
| 軸 CTA 約 36px、軸圓點約 14px | 整顆可點盒 ≥ 44px | `P0-TOUCH-44` |

`.axis-hero` 由上到下應是：眉題、標題、導語、深時間軸、CTA、編年圓點、模式軌、案例軌。首頁則是英雄區結束後才接時鐘、編年帶、模式軌與案例軌。

全站閘必跑：

| ID | 做法 | 沒抓到的量法 |
| --- | --- | --- |
| `TRAP-V01` | 360 寬對六頁各取全長截圖，與上一穩定版對 diff。熱區落在軸、CTA、模式卡者人工覆核 | 只截首屏或只截滾動後的中段 |
| `TRAP-V02` | 跑第 2.4 節碰撞腳本。回傳非空即 FAIL | 只看設計稿，不量盒子 |
| `TRAP-V03` | 列出 `position: absolute`／`fixed` 與負 margin，在 M、T、D 核對參照容器 | 只讀 `z-index` 數值 |
| `TRAP-V04` | 頁中、頁尾、`/#slice` 直達三態各留圖，並真的點 CTA、點圓點、滾到回到頂部 | 只拍首屏靜止圖 |
| `TRAP-V05` | 在軸軌上斜向滑、快速滑；編年軌從 01 滑到末顆 | 只看預設捲動位置，或把切掉的晶片說成「可以滑回來」 |
| `TRAP-V06` | 注入當日最長真實標題與最長 pill，在 360 看換行後有沒有相壓 | 用短文案代表上線文案 |
| `TRAP-V07` | 暗色下對軸圖（含暗角最亮段）、紙紋、墨色字取樣點算對比 | 只拿色票對 `#161c24`，不看背景圖 |
| `TRAP-V08` | 至少一支 iOS Safari、一支 Android Chrome，滑完 H 與 C。雲端真機可以。桌面模擬不能當唯一通過 | 只開 DevTools 裝置模式 |
| `TRAP-V09` | 所有 `100vh`／`100dvh` 在網址列展開與收合兩態各看一次 | 只量展開態 |
| `TRAP-V10` | 瀏海與手勢條機型核對固定 CTA 與頁尾的 safe-area | 把瀏覽器外框的裁切記成網頁裁字，或相反 |

`TRAP-V01`、`TRAP-V02`、`TRAP-V04` 要自動化結果加上人工覆核，放進證據包。

---

## 7. 過關規則

本節是鎖定規則，不是提案。

### 7.1 票與 Critical

檢測席：Kimi K3、Grok 4.7、GLM 5.3。三席各自對本正典清單逐項投 PASS 或 FAIL，先不看另外兩席的結果，再彙整。

同時滿足才可上線：

1. 三席都投了票。缺一席，不得用剩下的票折成過關。棄權等於沒有 PASS。
2. **3/3 PASS**。沒有 2/3 通道。任一席 FAIL，整閘 FAIL。另外兩席的 PASS 不覆蓋它。
3. **Critical＝0，硬條件。** 任一 P0 為 FAIL，Critical 即不為 0。品牌字樣錯誤、大面積不可讀或不可點、首頁或文明 hub 白屏，同樣使 Critical 不為 0。
4. **P0 不可由投票豁免，也不可由 GM 豁免。** 票不能把 P0 改寫成 P1 或 P2。任一席用截圖指出一條 P0，該條維持 FAIL，直到新截圖顯示它在同一頁、同一視口、同一主題消失。
5. 第 7.3 節證據齊全。寫「已看過」而不附圖，該條視為未測，整閘不得 PASS。
6. **GM 是唯一上線簽字人。** 三席在證據表用模型名留下 PASS／FAIL。那是投票紀錄，不是第二把上線鑰匙。沒有 GM 簽字的部署，視同未過閘。

三席都 PASS 而 Critical 仍大於 0，結果是 FAIL。

### 7.2 P1 與 P2

| 級 | 合併後 | 豁免 |
| --- | --- | --- |
| P0 | Critical。必須為 0 | 不可 |
| P1 | 不計入 Critical。未處理則不得上線 | GM 最多豁免 3 條。每條寫明頁面、視口、主題、原因、負責人，以及修復落在下一次走本閘的部署。空的日曆不算豁免。被豁免項在下一次全站閘自動改按 P0 覆核。超過 3 條未清，整閘退回 |
| P2 | 不擋 | 不需要豁免。留在備註 |

### 7.3 全站閘證據包

執行卡是下限。簽字前還要齊下列各項。同一張全長圖可以同時證明多條 P0，格子本身不可缺。

1. **全長截圖**：六頁 × 淺色與暗色 × 寬 360、390、768、1280、1440。H 與 C 再加寬 414，以及寬 1024 各一張（亮暗各一）。H 與 C 另附頁中、頁尾、錨點直達，視口等級至少 M、T、D。
2. **事故同框與點擊**（不得用靜止全長代替）：
   - C，360 與 390，淺色與暗色，首屏同框看見軸、兩顆主 CTA、編年圓點、模式卡與案例晶片
   - H，同樣四個組合，看見瘦軸，以及區外的編年帶與模式軌
   - C，360，暗色，點「跳到今日切片」之後的落點
   - N，360，暗色，含一張模式卡
   - L，360，暗色，首屏
   - A 的兩篇，360 暗色與 1280 淺色
   - C，768，淺色與暗色
   - H 與 C，1280 與 1440，淺色
   - 版頭特寫，360，暗色，字標五字完整
   - H、C 的軸節點，`VP-LAND`，暗色
3. **每條 P0** 至少有一張 ≤640 的圖對得上該條，檔名含日期與寬度。並附 `scrollWidth` 的 console 輸出；撐寬的元素寫下選擇器路徑。
4. **`TRAP-V02` 報告**為零碰撞。例外只限第 3 節寫明的兩種。
5. 間距小於 8px 的兩層，加一張帶盒子邊線的開發者工具圖，或在證據表寫下四邊座標。P0 失敗時另附一張失敗區域近拍。
6. console 無阻斷錯誤的截圖或錄影（`P0-RENDER-ERR`）。
7. Lighthouse 行動端截圖，含 LCP、INP、CLS（`P1-PERF`、`P1-CLS`）。
8. iOS Safari 與 Android Chrome 短片各一支，滑完 H 與 C（`TRAP-V08`）。雲端真機可以。
9. 證據表欄位：ID、頁、視口、主題、結果（PASS／FAIL／N/A）、檔名、檢測席。

檔名：`{日期}-{page}-{viewport}-{light|dark}[-state][-ID].png`。頁簡稱用 `home`、`civ`、`chronicle`、`learn`、`slice`、`news`。可集中放在 `docs/gates/evidence/`。PR 裡要打得開。

### 7.4 部署前後

- 部署前 5 分鐘：部署者重測 `P0-HSCROLL` 與 `P0-TOUCH-44`，結果回填 PR。
- 上線後 24 小時內：M 視口重跑 `TRAP-V01` 一次，截圖併入同一證據包再結案。

---

## 附錄 A. jd-tech-landing

適用站：`jainaspp.github.io/jd-tech-landing`。沿用的是本閘的精神，不是文明編年史的版面。Critical＝0 同樣是硬條件。P0 不可豁免。

### A.1 觸發與免閘

全站閘：hero 版式、全域 CSS、導航、首屏、動畫系統、CTA 位置或行為、路由、頁內 section 順序、錨點導航。拿不準就過閘。

免閘只限第 1.4 節四類，約束相同：不動模板、class、CSS、DOM 順序。仍須 CI 綠，加一張寬 ≤640 的全長 smoke 截圖。

### A.2 P0（不可裁）

覆蓋面從六頁收斂為單頁 × 各 section（hero、功能、卡片區、頁尾）。下列全部保留：

- 無橫向溢流（≤640 實測，閾值與第 2.4 節相同）。M 視口單欄。
- hero 標語與該站自己的完整品牌名不被裁。截斷即 FAIL。不檢查「文明編年史」。
- 主 CTA ≥ 44×44px，全頁只保留一顆主 CTA，不得 sticky 與 fixed 疊用。
- 重疊、裁字、z-index、sticky 落點、橫滑互撞、對比的量法與閾值沿用正文。對象改成該站首屏主標題、主 CTA、任何橫向圓點或卡片列、任何絕對定位裝飾。
- 對比仍是 4.5:1 與 3:1，量實際像素。墨 `#161c24` 與紙 `#f7f1e6` 不是該站必達色。
- 該站沒有的文明軸、編年圓點、模式卡，記 `N/A`。不要求做出一條時間軸。沒有橫滑容器時，`P0-HSCROLL-COLLIDE` 記 `N/A` 並留註。

### A.3 P1

對比若已在 P0 通過，P1 仍查：圖片夾寬、非裝飾文字 < 12px、以及正文第 4 節裡該站確實存在的項目。P1 豁免規則同第 7.2 節。

### A.4 證據、票、簽字

最少畫面：

- 首頁 360，淺色與暗色（該站若只有一個主題，則兩次首屏，都要含主 CTA）
- 首頁 768 與 1280，以及該站所使用的另一主題或第二次首屏
- 手機導航打開
- 最長滾動段的頁尾與固定鈕
- 各 section 錨點落地
- 主 CTA 點一次，確認落點不被貼頂列遮住
- `scrollWidth` console 輸出

能請到 Kimi K3、Grok 4.7、GLM 5.3 三席時，3/3 PASS 且 Critical＝0。缺席不得折成過關。該站若只有人工審、沒有三席，不得因此放寬 Critical＝0 或上列截圖；簽字人改為該站 GM。P0 仍然不可豁免。

---

## 附錄 B. 名詞

| 用語 | English | 說明 |
| --- | --- | --- |
| 全站閘 | FULL GATE | 第 1.2 節命中後必跑的完整檢測 |
| 免閘 | SKIP GATE | 只限第 1.4 節四類 |
| 必殺／應修／建議 | P0 / P1 / P2 | 阻擋級別。P0＝Critical |
| 執行卡 | pre-merge card | 合併或部署前至少附上的證據 |
| 證據包 | evidence bundle | 第 7.3 節的截圖、報告、錄影、投票紀錄 |
| 碰撞掃描 | bounding-box scan | `TRAP-V02` |

— 正典閘。來源是 PR #180、#181、#182。不包含程式碼或 CSS 變更。
