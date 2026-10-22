# scrollWidth 輸出（PR #198 R8）

日期：2026-10-22  
量法：`document.documentElement.scrollWidth > clientWidth + 1`，並以 `scrollingElement.scrollWidth > innerWidth + 1` 覆核。  
範圍：六頁 × 淺色與暗色 × 全長矩陣的每一格。原始數字在 `measurements.jsonl` 的 `measured.scroll` 與 `measured.overflows`。

## 頁面

每一格都是 `pageOverflow: false`。`scrollWidth === clientWidth === innerWidth`（等於該格的 CSS 寬）。沒有整頁橫向捲軸。

代表（首頁 360 淺色）：

```
scrollWidth 360
clientWidth 360
scrollingElement.scrollWidth 360
innerWidth 360
pageOverflow false
```

## 元素 `scrollWidth > clientWidth + 1`

這些沒有把 `documentElement` 撐出橫向捲軸。選擇器如下。360 淺色與暗色相同。

| 頁 | 選擇器 | delta | 說明 |
| --- | --- | --- | --- |
| H、S | `div#root > div.page`、`div.layout.layout-span`、`main#today`、`div.civ-home`、`div.axis-mount`，以及其下一個 `div` | 16 | 軸帶／編年帶／時鐘的 −16px 外距。盒子比自己的 client 寬 16px，頁面 `scrollWidth` 沒有跟著變大。 |
| C | `div.page.column-page`、`main#content` | 16 | 同上，總覽的 −16px 外距。 |
| H、S、C | `section#civ > div.deep-axis` | 243 | `overflow-x: auto`。軸軌自己的橫滑，不是整頁橫滑。 |
| N | `article.civ-article.chronicle-page` | 218 | `overflow-x: auto`。編年頁內的橫滑殼。 |
| N、L、A | `div.page.column-page` | 2 | 欄頁包裝差 2px。頁面 `scrollWidth` 仍等於 `clientWidth`。 |
| 全部 | `form.search-bar > label.sr-only` | 31 | 螢幕閱讀器標籤，`overflow: hidden`，1px 裁切盒。不是可見字。 |

沒有其他把頁面撐寬的選擇器。`P0-HSCROLL` 在這次矩陣記 PASS。近拍：`2026-10-22-home-360-light-P0-HSCROLL.png`、`2026-10-22-civ-360-light-P0-FIXED-WIDTH.png`。
