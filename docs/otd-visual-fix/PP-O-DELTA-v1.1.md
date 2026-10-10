# OTD 修正增量 v1.1（對齊 PP O 兩點）

| 欄位 | 內容 |
|---|---|
| 日期 | 2026-10-10 ~17:02 HKT |
| 狀態 | **交 Bad Bot 開工** |
| 相對 | `README.md` v1 色板；本檔改**嵌合策略**＋**首頁收合** |

---

## ① 新舊融合（唔換皮）

**原則**：當年今日／地標**繼承主站** `--bg`／`--card`／`--text`／`--muted`／`--line`／`--accent`（含 `html.dark`）。史感只用「小飾」，唔再另開一套全頁底色。

| 做 | 唔做 |
|---|---|
| 卡面＝`var(--card)`；字＝`var(--text)`／`var(--muted)` | 淺色整頁刷成厚黃紙／木紋舞台 |
| 深色跟主站 `--color-bg`／`--color-surface` | `#0e141c` 純黑頁＋`background-image:none` |
| 紙紋／木紋只做 **卡面或 section 內** 低透明疊加（建議 opacity 0.08–0.14） | `body:has(.heritage)` 覆蓋成另一個網站 |
| 左側 3–4px 銅→品牌藍飾條、Serif 標題、年份 seal | 大面積黃銅底板、第二套字色系統 |
| 獨立頁 `/on-this-day/`、`/hk/landmarks/` 同樣嵌主站 chrome | 史頁「進場換皮膚」 |

**Token（融合版，覆蓋 v1 過分離散建議）**

```css
.heritage, .heritage-page {
  /* 直接用主站 */
  --otd-card: var(--card);
  --otd-ink: var(--text);
  --otd-muted: var(--muted);
  --otd-line: var(--line);
  --otd-brand: var(--accent);
  --otd-brass: #9a7b4f; /* 僅飾線 */
  --otd-texture-opacity: 0.1;
}
```

- **刪／弱化**：`body:has(.heritage-page) { background-color:#e8dfd0; …木紋全頁 }`  
  → 改：`body` 維持主站；只 `.heritage`／`.otd-card` 上疊淡紋。
- 深色：**唔好**砍紋理；用 `color-mix`／低透明 `aged-paper` 疊喺卡上即可。

---

## ② 首頁「當年今日」＝懶人包式收合

**問題**：首頁常駐大塊 OTD 搶主欄。  
**對齊**：新聞卡 `details.angle-more`／懶人包「先收後睇」習慣。

### 結構建議（首頁 only）

```html
<details class="otd-pack">
  <summary class="otd-pack-summary">
    <span class="otd-pack-title">當年今日</span>
    <span class="otd-pack-kicker">溫和史 · 10月10日</span>
    <span class="otd-pack-teaser">今日 3 則 · 點開睇</span>
  </summary>
  <div class="otd-pack-body">
    <!-- 現有 otd-grid 最多 3 卡 -->
    <a class="section-more" href="/on-this-day/…/">睇晒 →</a>
  </div>
</details>
```

| 規則 | 定案 |
|---|---|
| 預設 | **收合**（`<details>` 無 `open`） |
| summary 高度 | 單行～兩行，似 digest／chip 列，**唔預留大圖** |
| 展開後 | 先出最多 3 卡；「睇晒」去全日頁 |
| 獨立路由 | `/on-this-day/`、`/hk/landmarks/` **保持展開全文**（唔用收合） |
| a11y | 原生 `details`；summary 可聚焦；尊重既有 motion 設定 |

### CSS 骨架

```css
.otd-pack {
  margin: 14px 0 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--card);
}
.otd-pack > summary {
  list-style: none;
  cursor: pointer;
  display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline;
  padding: 12px 14px;
  font-weight: 700;
}
.otd-pack > summary::-webkit-details-marker { display: none; }
.otd-pack-kicker { font-size: 12px; color: var(--muted); font-weight: 600; }
.otd-pack-teaser { margin-left: auto; font-size: 12px; color: var(--accent); }
.otd-pack-body { padding: 0 14px 14px; border-top: 1px solid var(--line); }
/* 展開前唔渲染大圖：可保持 DOM，或 SSR 只放 summary＋展開再 hydrate 圖——實作揀成本低者 */
```

### 實作落點（Bad Bot）

1. `shared/heritagePage.ts` → `renderOnThisDaySection()` 包一層 `details.otd-pack`（**僅首頁呼叫路徑**）。
2. 全日／地標頁 renderer **唔包** details。
3. `App.css`：加 `.otd-pack*`；同時把 `body:has(.heritage)` 全頁換皮**收斂**成卡內紋理（①）。
4. 驗收：首屏唔再見常駐三卡大圖；開合跟主站深淺色一致。

---

## 驗收一句

新舊同一個皮；史感靠飾線／Serif／淡紋；首頁 OTD 預設收埋，似懶人包。

## 已開工（Bad Bot）

- 2026-10-10：見 `PP-O-DELTA-v1.1.md`；repo branch `fix/otd-fuse-collapse`。
