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

編年里程碑繼續由 `chronicleMilestones.ts` 提供，頁面仍用既有里程碑樣式。地球生命頁繼續走 `renderReadingBlock`。兩邊不各寫一套產物與推動力欄位。

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
