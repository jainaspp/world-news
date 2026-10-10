# OTD／香港地標 — 視覺修正方向（開工草稿）

| 欄位 | 內容 |
|---|---|
| 日期 | 2026-10-10 ~16:42 HKT |
| 起草 | Art |
| 狀態 | **交 Bad Bot 開工草稿 → PP O 批** |
| 範圍 | 當年今日＋香港地標（`heritage`／`heritage-page`） |
| 紅線 | 溫和史；避政治 |

## 問題（現況）

1. **深色模式**：`body:has(.heritage-page)` 用 `#0e141c` 且 **砍晒木紋／舊紙底** → 感覺「純黑洞穴」。
2. **淺色模式**：史欄紙卡 `#f7f1e6`／全頁木底，同主站新聞 `--color-bg:#f4f6f8`＋`--card:#ffffff` **兩個系統打架** → 一邊過暖、一邊過白，兩邊都怪。
3. **極端對比**：深色字近黑、淺色卡近白；未對齊主站字階／卡片語言。

## 方向（一句）

史欄繼續有「地方誌」暖感，但**底色／卡片／字階掛返主站 token**；深淺兩模式都用**中性偏暖灰**，禁止純黑 `#000`、純白 `#fff` 當大面積。

## Token 建議（疊在現有 `:root`／`html.dark` 上）

### 淺色（heritage scope）
| Token | 現況問題 | 建議 |
|---|---|---|
| 頁底 | 全頁重木紋 | `--otd-page: #f0ece4`（主站灰藍底＋8–12% 暖）＋木紋 **opacity ≤0.18** 或只喺 section 內 |
| 卡面 | 厚紙黃 | `--otd-card: #f7f5f1`（近主站 surface，唔用 #fff） |
| 正文 | `#1a140e` 偏炭黑 | `--otd-ink: #1a2332`（對齊 `--color-text`） |
| 輔助 | `#5c4a38` | `--otd-muted: #5a6575`（對齊 muted，略暖） |
| 線 | `#e2d6c2` | `--otd-line: #d5d0c6`（近 `--color-line`） |
| 品牌 | `#1d4f91` | **保留**；kicker／連結用主站 accent |
| 黃銅 | 飾條 OK | 只做 3–4px 飾線／年份 seal，唔做大底板 |

### 深色（heritage scope）
| Token | 現況問題 | 建議 |
|---|---|---|
| 頁底 | `#0e141c`＋無紋 | `--otd-page: #161c24`（略暖於主站 bg，**唔用純黑**）＋舊紙紋 **opacity 0.12–0.16**（唔砍圖） |
| 卡面 | 死褐 `#2a241c` | `--otd-card: #1e2630`（對齊 `--color-surface` 語感） |
| 正文 | `#f4efe6` 近白 | `--otd-ink: #e8eef5`（對齊深色 text，略降對比） |
| 輔助 | `#d9cbb8` | `--otd-muted: #b7c2d0` |
| 線 | `#4a3d2e` | `--otd-line: #2e3b4c`（主站 line） |
| 卡邊 | 過褐 | `border-color: color-mix(... var(--line) 70%, #9a7b4f 30%)` 微銅 |

## 字階（對齊主站）

| 用途 | 建議 |
|---|---|
| 頁 H1 | 28px／Serif 700（現有 OK） |
| 區 H2／卡題 | 18–20px Serif |
| 事實句 | 15–16px Sans 700（唔再過大） |
| caption | 13px Serif；`color: var(--otd-muted)` |
| kicker／archive | 12px；letter-spacing 可留 0.12–0.18em |
| 行高 | 正文 1.55；caption 1.45 |

## 卡片語言（對齊新聞卡）

- `border-radius: var(--radius-lg)`（16px）
- `box-shadow: var(--shadow-sm)` 淺色；深色 **無重影**（跟主站 dark）
- 圖區底：`#e8e2d8`／深色 `#243040`（唔用死白死黑）
- 年份 seal：海軍藍半透明底＋淺字；深色改品牌淺藍底

## 實作順序（Bad Bot）

1. `App.css` heritage 段：換上表 token；**深色恢復低透明紙紋**，唔再 `background-image: none`。
2. 首頁 `.heritage` 區塊同獨立 `/on-this-day/`、`/hk/landmarks/` 共用同一組变量。
3. 唔改內容種子／紅線文案。
4. 驗收：淺色唔「報紙發黃打架」；深色唔「純黑」；卡面唔「純白塊」。

## 檔

- `tokens.css` — 可直接貼／import 試作
- `compare.html` — 現況 vs 建議色板並排
- `SHOTS.md` — 建議截圖清單

內容紅線不變：地理／建築／民生；避政治。
