# 文明深讀契約

真源是 `contract.ts`。本頁供改資料的人對照。加內容只改資料，不新增 `/civilization/` 路由，也不在渲染器裡按卡片編號寫分支。

## 四線閉集

`CivLine` 只有四項，順序固定：

1. 能量
2. 信息
3. 制度
4. 貨幣

宇宙頁的物質、時間，地球頁的環境、類群，技術頁的工具、能源、媒介、知識，都是別的命名空間，不寫進 `CivLine`。度量是模式卡的題目，不是第五條線。

## 共同深讀形狀

`ReadingBlock`、`ChronicleMilestoneBlock`、`CivCard` 都滿足 `CivReadingShape`：

| 欄位 | 含義 |
|------|------|
| `event` | 界定事件 |
| `eventDetail` | 界定事件段落 |
| `products` | 產物。每項有 `name`、`detail`，可有 `kind` |
| `drivers` | 推動力。每項有 `name`、`detail` |
| `impact` | 溫和影響 |

編年里程碑繼續由 `chronicleMilestones.ts` 提供，頁面仍用既有里程碑樣式。地球生命頁繼續走 `renderReadingBlock`。技術頁與城市頁的階段深讀也走同一塊，資料分別在 `content/techReadings.ts` 與 `content/cityReadings.ts`。各頁不另寫一套產物與推動力欄位。

## 技術頁與城市頁

每一階段的陣列可以有多塊。加一塊只加資料，不改 `functions/civilization/[[path]].ts`，不加 `PAGES` 鍵。第一塊的錨是 `#tech-N-reading`、`#tech-N-product`、`#tech-N-driver`，城市頁把前綴換成 `city`。同階段第二塊起用 `slug` 分開。

技術頁的 `lines` 與產物 `kind` 只用工具、能源、媒介、知識。城市頁只用聚落、工程、交通、民生。這些詞不寫進 `CivLine`。

`image` 省略時，塊內留下紙感「產」印。填上 `/static/civilization` 下的基名後，同一槽改顯示圖像。

香港地標只留在城市頁本地案例末尾的目錄連結。階段正文仍是全球城市線，不把節點做成跳去地標的空殼。

## 模式卡

資料在 `patterns.ts` 的 `PATTERN_CARDS`。渲染只讀這份陣列。

| 欄位 | 約束 |
|------|------|
| `id` | 穩定的英文短橫 slug |
| `title` | 卡片標題 |
| `lines` | `CivLine` 的一至四項，不可重複 |
| `anchor` | 必須是已有的 `/civilization/chronicle/#stage-N` |
| `problem` | 不多於 40 字 |
| `mechanism` | 不多於 120 字。換場景仍成立的約束 |
| `boundary` | 不多於 80 字。不適用邊界 |
| `maintenance` | 維修、傳承與備件靠什麼維持 |
| `ask` | 不多於 28 字。今日可問，不是動員句 |
| `products` | 至少一項 |
| `drivers` | 至少一項 |
| `sources` | 至少四條 `https` 網址。其中恰好一條 `supports: 'mechanism'`，標出機制句主要依據 |
| `sliceThemeIds` | 可省略。空則不渲染切片列。切片橋由另一軌填寫 |

首批三張：

| id | 線 | 錨點 | 不適用邊界 |
|----|----|------|------------|
| `power-store` | 能量 | `#stage-7` | 可用功率提高，不等於分配跟著改善 |
| `copy-check` | 信息 | `#stage-3` | 複製變便宜，不等於內容變真 |
| `measure-promise` | 制度、貨幣 | `#stage-6` | 度量互通，不等於出現單一中心 |

`power-store` 的維修句寫明：技術在場，若維修、師徒或備件中斷，可用功率會退回去。

`copy-check` 的維修句寫明：複製成本下降之後，若沒有校驗，協作半徑會把錯誤一起放大。

## 掛在哪裡

- 首頁與總覽的文明軸下，有三枚紙感入口，鏈到編年錨點。
- 總覽正文有模式卡全文。
- 編年頁在對應階段內渲染同一張卡，並在頁首提供跳轉。
- 階段卡上，有模式卡的階段多一條「模式卡」連結。

卡片未達獨立厚頁字數門檻，不進網站地圖，不加 `PAGES` 鍵。

## 加一張卡

1. 在 `PATTERN_CARDS` 追加一筆，欄位按上表寫完。
2. `anchor` 使用已經上線的編年階段。
3. 跑契約測試。`civCardIssues` 回傳空陣列才算通過。
4. 不改 `functions/civilization/[[path]].ts` 的路由表，不為方法、能源、交流、收藏或寶庫另開網址。

## 視覺

沿用墨色 `#161c24` 與紙感 `#f7f1e6`。模式卡使用既有 `.civ-block` 紙卡，只增加 `.pattern-card`。不換皮。

## 問題索引

資料在 `questions.ts` 的 `CIV_QUESTIONS`。總覽在近層之下渲染這份陣列，不另寫死 HTML，也不新增路由。

每條是一句常設問題（不多於 28 字），問機制如何運作，不問人物排名。`href` 只能指向已經上線的錨：

- 模式卡 `/civilization/chronicle/#pattern-{id}`，或總覽上的 `#pattern-{id}`
- 編年 `#stage-N`、科技 `#tech-N`、地球生命 `#earth-N`、起源長頁 `/civilization/origins/`
- 首頁近層 `/#near-{主題 id}`

五條近層問句都要出現在索引裡。對得上的列再加一條「今日近層」。`questionIndexIssues` 回傳空陣列才算通過。

## 案例專篇

資料在 `cases.ts` 的 `CASE_STUDIES`。一篇是陣列裡的一筆，掛進已經上線的編年或科技階段，不新增路由，也不進 `PAGES`。

| 欄位 | 約束 |
|------|------|
| `id` | 穩定的英文短橫 slug。頁內錨是 `#case-{id}` |
| `outcome` | `成` 或 `敗`。敗篇只寫中斷條件，不寫人群高下 |
| `mount` / `beside` | `mount` 是 `/civilization/tech/` 或 `/civilization/chronicle/`。`beside` 是該頁已有的 `tech-N` 或 `stage-N` |
| 正文 | `lede` 加 `paragraphs`，漢字不少於 800 |
| 深讀 | `event`、`eventDetail`、`products`、`drivers`、`impact`，以及問題、機制、邊界、維修條件、今日可問 |
| `sources` | 至少四條 `https`。其中恰好一條 `supports: 'mechanism'` |
| `related` | 至少四條，且須同時含一張模式卡、一個階段錨、以及 `/civilization/#question-index` |

首批兩篇：

| id | 結果 | 掛在 |
|----|------|------|
| `print-cost` | 成 · 印刷與知識成本 | 科技頁 `#tech-7`，並連到 `copy-check` |
| `gear-pause` | 敗 · 齒輪裝置的中斷條件 | 編年 `#stage-4`，並連到度量、維修與複製三張卡 |

`caseIssues` 回傳空陣列才算通過。軸下另有兩枚紙感入口，鏈到這兩個錨。

## 總覽四線篩選

總覽在編年階段卡之前放一排篩選：全部、能量、信息、制度、貨幣。不新增路由，也不換皮。

一塊要麼整組 `lines` 都在 `CivLine` 裡，要麼不參加。階段卡，以及走共用深讀塊、且 `lines` 全部屬於 `CivLine` 的模式卡與案例，渲染時帶 `data-lines`。地球、城市、科技各自的線名不寫進這個屬性。總覽頁上實際被收合的，是編年階段卡與模式卡。腳本只讀 `data-lines`，不另寫分類表。

未執行腳本時，按鈕沒有動作，卡片全部留在頁上。選中的線若沒有匹配，只顯示一句紙感說明，不做高度動畫。`civ-reveal` 與 `prefers-reduced-motion` 維持原樣。

## 展望（P0）

真源是 `future.ts`。`futureIssues` 回傳空陣列才算通過。不新增 `/civilization/future/`，不加 `PAGES` 鍵。`CivLine` 仍是能量、信息、制度、貨幣，展望不新增第五條線。

軸序在城市與今天之間插入 `future`，鏈到 `/civilization/#future`。總覽在編年板之後放 `#future`。編年 `#stage-10` 只加一條八十至一百二十字的展望・分域橋，階段名不改，不新增第十一階。編年帶仍是階段一至十。

視覺沿用墨色 `#161c24` 與紙感 `#f7f1e6`。不換皮。

### 分域

`FutureDomain` 閉集 F1–F6，順序固定：

1. 能量宜居
2. 信息可信
3. 制度協作
4. 生物譜系
5. 技術能力階
6. 生存風險

每域有標題、短述、狀態（`加厚中` 或 `有卡`）、可選的 `lines`，以及總覽錨。`lines` 若寫，只能是 `CivLine`。有卡表示已有展望、實例、能力階或譜系卡掛在該域；加厚中只有入口，沒有卡片。這兩個詞只留在契約裡。頁面芯片改寫成「已有可讀卡片」與「尚未寫入卡片」。開場先寫六個入口各自回答什麼，再寫「不另開網址」。

每域另有一張 `plate`。`cover` 是 `/static/civilization/future-fN-cover`，頁面帶 400、640、1280 三檔。圖檔沒有可讀文字。`alt` 只寫紙感氣氛。芯片若顯示，依次為：F1 功率與宜居帶、F2 校驗成本、F3 規則與公共品、F4 共演化遺產、F5 條件帶示意、F6 監測與緩解。生物多樣性展望另有 `future-horizon-biodiversity-cover`，芯片為 H-bio 生態系服務。其餘展望不掛圖版。墨色仍是 `#161c24`，紙感仍是 `#f7f1e6`。

### 成熟度

`FutureTier` 閉集：`observe`、`pilot`、`infra`、`civ-scale`。這是成熟度，不是賽跑名次。頁上只展示前三檔，並標「約」「示意」「假說」。`civ-scale` 留在契約裡，不畫成等級，也不與前三檔相加。

### 分帶圖例

`LevelBand` 為 e0–e4、i0–i4、a0–a4，只作 `#future` 與 `#stage-10` 的側欄圖例。各帶不換算，沒有合成分數，也不寫第幾級文明。e2、i2、a1 各有一句，說明這一層在記什麼，避免被讀成文明等級。頁上的「約」「示意」「假說」是成熟度記號。

### 譜系

`FutureClade` 只發布 `tool-extension`（工具延伸）與 `niche-continue`（生態位延續）。邊界句必填。敘事三層為共享遺產、共演化、SETI尚無確證。不寫優生，不寫人群高下，也不寫封閉棲居。

### 展望與檢查點

`FutureHorizon` 六則：氣候宜居約束、信息可信與大規模誤導、近地／空間天氣監測、生物多樣性與生態系服務約束、抗微生物藥物耐藥性（AMR）、淡水可用量與衛生服務壓力。每則有分帶、信心、機制、緩解、不確定、`data_as_of`，以及至少四條 `https`。標題不寫災變。生物多樣性一則的主域是生存風險，並見生物譜系；種類是生物圈，時間帶是進行中，圖例分帶是能量帶 e1，日期戳是 2026-10-19。抗微生物藥物耐藥性一則的主域也是生存風險，並見生物譜系；種類是健康，時間帶是數十年，圖例分帶是能動帶 a1，日期戳是 2026-10-19。淡水一則的主域也是生存風險，並見能量宜居；種類是資源，時間帶是進行中，圖例分帶是能量帶 e2，日期戳是 2026-10-19。時間帶不是等級，也不換算。分域短述各在四十至八十字。

`CountdownItem` 至少一則，掛在某一展望上。世界氣象組織的年度評估窗口、生物多樣性框架進度窗、世界衛生組織抗微生物藥物耐藥性國家自評的年度窗口，以及聯合國水機制的淡水進度窗口，都是檢查點，不是災變時鐘。句子在伺服器寫成靜態文字。不用紅色，不做秒針，也不寫只剩多少天。日期一過，改顯示等待下一輪的靜態說明。

### 實例卡

`FutureInstance` 仍掛在總覽錨上，不另開網址，不加 `PAGES` 鍵，也不進網站地圖。每張有短題、八十至一百二十字的短述、機制、`tierId`、可選的分帶標籤、`dataAsOf`（YYYY-MM-DD，彙編日期），以及至少四條 `https`。分帶只作標籤，不設合成分數，也不與其他帶相加。`tierId` 用 `observe`、`pilot` 或 `infra`。`civ-scale` 若不在卡面標明假說，不得使用。

W1 只加兩張，都從既有陣列渲染，不按編號另寫分支：

| id | 分域 | 成熟度 | 分帶 |
|----|------|--------|------|
| `energy-budget` | F1 能量宜居 | 觀測 | e2 |
| `verify-flood` | F2 信息可信 | 試點 | i2 |

備援電網仍在 `energy-budget` 同一張裡，與行星收支分成兩段，不另立 `spare-grid`。短述用政府間氣候變化專門委員會第一工作組第七章的「向外長波輻射」。「觀測」只標收支監測。BAL-002-3 只適用北美可靠性標準下的應急備用。`verify-flood` 的撤稿鏈只以 NISO CREC 與 Crossref 的版本、更正、撤稿頁為據；其餘來源標明不作為撤稿鏈依據。信息展望裡的萬維網簡史只說明複製變便宜，不支撐大規模誤導。F3 至 F6 的狀態與此前相同。

### 今日切片回扣 F-domain

編輯把今日切片掛回展望時，只寫機制問句，並指向已經上線的分域錨。不新增路由，也不把佔位例子寫進 `CIV_QUESTIONS`。下列三則只是例子：

1. 儲能如何受宜居窗口約束？ → `/civilization/#future-f1`（能量宜居）
2. 轉發之前，底本靠什麼留下？ → `/civilization/#future-f2`（信息可信）
3. 空間天氣通報如何被事後核對？ → `/civilization/#future-f6`（生存風險）
