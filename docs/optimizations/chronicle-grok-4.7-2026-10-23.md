# 文明編年史優化審計 · Grok 4.7 · 2026-10-23

**性質：** 獨立優化審計。唔係站級重大更新閘票，唔係 TRAP-V08，唔合併、唔改產品碼。  
**鎖稿：** `BRIEF-GM-ADOPT-2026-10-22`（三卷疊十階；新聞只係 `#slice`；古凍結／今加厚／未來章門 P0，全文搬遷係可選 P1）。已知修復上下文見 `FIX-BRIEF`（#198 之後）。  
**對照：** 線上 https://world-news.xyz/ 與主幹 `d939a0a`（`feat(chronicle): 三卷疊十階 P0 (#198)`）。  
**量測：** 2026-10-23，headless Chrome 156，390×844 與 360×800，淺色，單次。唔係 Lighthouse，唔係真機片。下文毫秒只係呢一次樣本。

---

## 1. Executive summary

- 三卷骨架已經在線上：首頁同總覽各三張 `.volume-card`，編年有 `#ch-ancient`／`#ch-now`／`#ch-future` 同 `#stage-1`…`#stage-10`。階 10 標題係「本世紀／當代」，編年年代標無「近未來」，空嘅當年今日停留喺「此日沒有收錄紀事」。今次無新 P0 要另開一份稿。
- 三十秒定位仍要再捲一屏。390 寬：開場高 709px（頂 165）；七節點軸頂 874；監測鐘頂 1163；三卷卡頂 1332。讀者先見到「今天」軸同 1 分 29 秒，先至見到古／今／未來。編年頁頂同時放三卷 chip 同十階 chip。
- 主幹今章散文仍然短（階 6–9 約 91–138 漢字，階 10 已 609，另加每階約 350–410 字嘅里程碑深讀）。加厚已有 PR，唔再新寫。`#224` 會重開「古凍結」，要排喺卷二之後，並等解凍。
- 銜接斷層：編年正文無宇宙連結、無 `/#monitor`；開蒙只喺頁首 chip 同頁腳。站上無會員面。監測鐘只在首頁，出站連結實測 98×16。
- 手機（描述，唔當閘）：360／390 文件 `scrollWidth === clientWidth`。編年 chip 會換行，唔係橫滑陷阱。深時間軸係預期橫滑；360 寬「城市」露出約 12px。今次短窗 CLS 0，唔當實驗室分數。

---

## 2. Findings

主幹階散文漢字（`[\u3400-\u9fff]`，只計 `prose`）：1=107、2=101、3=86、4=109、5=88、6=91、7=94、8=138、9=135、10=609。里程碑深讀另計約 354–409／階。線上編年可見漢字約 12,200；宇宙頁約 2,500；起源約 3,400；開蒙約 430。編年頁 390 寬文高約 40,000px。

| ID | Severity | Area | Finding | Proposed fix | Effort | Depends on open PR? |
| --- | --- | --- | --- | --- | --- | --- |
| `hero-kicker-computed-bg` | P0 | 效能／對比 | 線上 `.hero-kicker` 係 `#c4a572`，`.hero-opening` 的 `background-color` 係透明，顏色在 `background-image` 深色漸變上。對住漸變停點約 **7.3:1**（`#161c24`）／**6.7:1**（`#1c2431`）。自動化若用頁紙 `#f4f6f8` 會計成 2.16。FIX-BRIEF 的 2.16 係呢個計分差，唔係而家肉眼淺底。 | 已有 PR。`#228` 把 `background-color` 設成 `#161c24`，令計分同畫面一致，並保留銅金字。唔好把 kicker 改成墨色（深底上會倒轉失敗）。 | S | 已有 PR [#228](https://github.com/jainaspp/world-news/pull/228) |
| `learn-reset-44` | P0 | 手機 | 線上開蒙「重設本機進度」360 寬實測 **112×30**。 | 已有 PR。`#228` 把 `.learn-actions button` 收到 min 44。唔另開。 | S | 已有 PR [#228](https://github.com/jainaspp/world-news/pull/228) |
| `home-hub-lcp-vignette` | P0 | 效能 | 首頁同總覽的 LCP 元素仍係 `.axis-vignette`（`civ-home-axis-bg-1280w.webp`）。今次未節流樣本：首頁冷載約 3.2s，其後總覽約 0.23s（快取）。FIX-BRIEF 的模擬 4G 4.4s／5.4s 維持原紀錄，今次唔取代。編年 LCP 係正文段落，未節流約 0.2s，唔係痛點。 | 已有 PR。修法留喺 `#238`，並且已經捲入 `#241`。`#241` 繼續 **HOLD**。要 LCP 而不要十二秒開場，就從 wire 拆出圖像那一刀，唔好為 LCP 合併成條 wire。 | L | 已有 PR [#238](https://github.com/jainaspp/world-news/pull/238)、[#241](https://github.com/jainaspp/world-news/pull/241) HOLD |
| `home-volume-before-monitor` | P1 | IA／導航 | `App.tsx` 順序係開場 → 七節點軸 → `renderBulletinClock()` → 三卷卡。390 寬三卷頂 1332，鐘頂 1163。第一屏係開場詩。 | 三卷卡移到監測鐘之前（軸可以留喺開場同三卷之間）。鐘仍獨立、無秒針，連結仍去總覽 `#future`。唔好塞進 `#241` 的開場 wire。 | S | `#241` 同改 `App.tsx`。等 HOLD 決定，或另開一只唔掂開場的小 PR |
| `chronicle-jump-volumes-first` | P1 | IA／導航 | 編年頁頂有「跳到卷」三粒，跟住「跳到階段」十粒，然後先至卷一扉頁。十階因此再次同三卷並排做主目錄。章內 chip 列已經存在。360／390 十粒會換行（`scrollWidth === clientWidth`），唔係橫滑陷阱。 | 刪頁頂十階 `<nav>`。保留三卷 chip、各卷扉頁內的刻度 chip，同 `#stage-N` 錨。 | S | `#227`、`#223` 都改 `chronicle.ts`。排喺卷二散文落地之後。`#224` 若先合會再撞檔 |
| `axis-today-gloss` | P1 | IA／導航 | 軸節點文字係「今天／切片」，同宇宙、地球、未來並列；三卷卡的章名係「今」。頁首 chip「今天」去 `/#slice` 符合鎖稿（今天＝新聞切片）。編年年代標無把「今天」當年代。 | 軸副標加一句：「軸上『今天』只去新聞切片；編年章名是『今』。」唔改 chip 目的地，唔改節點 id。 | S | `#238`／`#241` 掂 `civilizationPage.ts`／`spine.ts`。同 `home-volume-before-monitor` 一齊排 |
| `vol3-static-monitor-cite` | P1 | 開蒙／會員／末日鐘 | 監測鐘只在首頁 `#monitor`。編年 `#ch-future` 無去 `/#monitor`。階 10 正文寫「不把監測讀數寫進展望」，然後無路去個讀數。出站句「展望見文明總覽」實測 **98×16**。站上無「會員」字，只有頁首「訂閱」。 | 卷三扉頁加一句同連結 `/#monitor`，寫明刻度靜態、無秒針。首頁該連結 min-height 44。數字留喺 `clock.ts`，唔抄進 `future.ts`。**閘風險：** 把 1 分 29 秒寫進 F6、或加秒針。 | S | 扉頁句等 `chronicle.ts` 散文 PR。44px 等 `#228` 的 `App.css`。唔好改 `#233` 的未來正文 |
| `questions-by-volume` | P1 | IA／導航 | 總覽問題索引係一條 15 問平表（`questions.ts`），古、今、未來先例混在一列。鎖稿 P1 已寫三卷分組。 | 渲染分成三組：古（起源／階 1–5／對應模式）、今（階 6–10 同近層）、未來（`#future-f*`）。錨同路由不變。 | S | 無。`questions.ts` 唔喺開住的內容 PR 裡。本週可以先做 |
| `ch-ancient-deep-time-links` | P1 | IA／導航 | 編年正文去起源 3 次（階 1、階 2、頁尾），去宇宙 0 次、去地球 0 次。卷一扉頁寫「深時間仍交起源長頁」，扉頁本身無連結。宇宙頁有回編年，無 `#ch-ancient`。 | 只在 `#ch-ancient` 加上已有的 `/civilization/cosmos/` 同 `/civilization/origins/`。宇宙頁回程可指向 `#ch-ancient`。唔加路由。 | S | 扉頁在 `chronicle.ts`，排喺卷二散文之後。宇宙回程若改 `cosmos.ts`，等 `#234` |
| `vol2-prose-thin` | P1 | 內容平衡 | 階 6–7 無 `.stage-ask`（頁上「機制問題」只出現 3 次，在階 8–10）。階 6–9 散文低於階 10。深讀塊令每一階都唔係空頁，但掃讀段仍係一句。階 8 收到 1969、階 9 由 1970 起，窗口無相交。 | 已有 PR。唔另寫。階 6–7 見 `#227`，階 8–10 見 `#223`。 | — | 已有 PR [#227](https://github.com/jainaspp/world-news/pull/227)、[#223](https://github.com/jainaspp/world-news/pull/223) |
| `vol1-freeze-vs-224` | P1 | 內容平衡 | 鎖稿：卷一唔新寫。`#224` 把階 1–5 散文由約 86–109 字加到約 530–684 字，錨不變。 | 已有 PR，當排期項：卷二合完先至 rebase。未見解凍之前，唔當必合，亦唔再開第三份古章稿。 | — | 已有 PR [#224](https://github.com/jainaspp/world-news/pull/224) |
| `future-stay-on-hub` | P1 | 內容平衡 | 六域面板仍在總覽 `#future`（線上有 `future-f1`）。編年只得章門同階 10 橋，符合 P0。面板正文仍薄。 | 已有 PR `#233` 在 `future.ts` 加厚，唔搬頁。搬全文入卷三仍然係鎖稿的可選 P1，本週唔做。 | — | 已有 PR [#233](https://github.com/jainaspp/world-news/pull/233) |
| `cosmos-prose-thin` | P1 | 內容平衡 | 主幹宇宙十階 `prose` 合計約 1,124 漢字，貼住 1,200 的收錄地板。編年無路去呢一頁。 | 已有 PR `#234`。回程錨見 `ch-ancient-deep-time-links`。 | — | 已有 PR [#234](https://github.com/jainaspp/world-news/pull/234) |
| `learn-tree-thin` | P1 | 開蒙／會員／末日鐘 | 線上開蒙約 430 漢字、12 道門。編年正文無一句帶去開蒙；頁首 chip 同頁腳有。`#225` 同 `#232` 都改 `catalog.ts`、`learnPage.ts`、`App.css`。 | 已有 PR。兩份要合成一條開蒙線先至合，唔好先後各合一次。編年只加一句去 `/learn/`（可同 `vol3-static-monitor-cite` 一齊），唔好在編年重寫課程。 | S（一句） | 已有 PR [#225](https://github.com/jainaspp/world-news/pull/225)、[#232](https://github.com/jainaspp/world-news/pull/232) |
| `fresh-chip-overlap` | P1 | 手機 | 深色首頁約 355–390px，新頭條 chip 曾蓋住卷二／卷三。今次 headless 固定層只見到頁首 `.chrome`，chip 未必在呢個資料狀態出現。 | 已有 PR。唔另開。 | S | 已有 PR [#240](https://github.com/jainaspp/world-news/pull/240) |
| `stage-6-7-ask-slot` | P2 | 內容平衡 | `#227` 把機制答覆寫進散文，PR 說明唔加 `mechanismAsk` 欄。階 8–10 的掃讀句「機制問題：…」在 6–7 仍然會缺。 | `#227` 落地後，階 6、階 7 各加一行已有的機制問句（同階 8–10 同一欄）。唔再加厚段落。 | S | [#227](https://github.com/jainaspp/world-news/pull/227) |
| `chronicle-bridge-pack-link` | P2 | 內容平衡 | 銜接段寫懶人包／時間線，文內連結只得總覽、起源、`/#slice`。懶人包同「多方時間線」只在「更多」同頁腳。空當年今日無跌去階 9。 | 銜接段加兩條已有網址：`/explainer/`、`/today/`（沿用「不是軸上的今天」）。無匹配就繼續唔出空框。 | S | 無硬依賴。同 `chronicle.ts` 散文 PR 錯開 |
| `stage5-https-source` | P2 | 內容平衡 | 階 5 主來源係 `http://www.cnm.com.cn/...`。階 4 同一館亦有 http。階 10 已有多於四條 https。 | 換成該館的 https 頁，或在來源表標明 http。唔改史實句。 | S | 無 |
| `chronicle-scan-line` | P2 | 內容平衡 | 編年 390 寬約 40,000px。模式卡同深讀塊令階 3 一類特別長。加厚 PR 會再長。 | 每階保留而家的短散文做掃讀，深讀維持展開。加厚落地之後先至加「本節摘要」錨，唔好用 `<details>` 把新正文摺起。 | M | `#227`、`#223` 之後 |
| `home-inner-overflow-16` | P2 | 手機 | 390 寬首頁內層 `.page` 的 `scrollWidth` 比 `clientWidth` 多 16px；文件本身仍係 390＝390，無整頁橫拉。360 同樣差 16px。軸的橫滑係 `.deep-axis` 自己的 `overflow-x: auto`。 | 先描述。真機若無橫向彈跳就收檔。唔好為此拆軸。 | S | 無。唔當 Critical |
| `future-door-repeat` | P2 | 內容平衡 | 階 10「展望・分域」同 `#ch-future` 各有一組 F1–F6 連結，並各寫一次「第十階」。頁上無「十個階段」產品句。 | 保留兩組連結（節內同卷末）。卷末扉頁收短成一行章門，避免第二遍長句。 | S | 散文 PR 之後 |

手機補充（360／390，描述）：軸節點高 55，寬約 69–77，大於 44。編年 chip 在首 2500px 內無低於 44 的命中（頁首「首頁／文明」麵包屑、行情 tick、logo 高 28 係全站 chrome，唔開編年單）。360 寬軸：城市左緣約 348，視窗 360，露出約 12px，滿足 FIX-BRIEF「至少 8px」的描述，今天同未來要再滑。無真機片，以上全部唔當 TRAP-V08 或 Critical 閘。

動畫：線上開場已經係深色舞台，主幹 `.hero-opening` 同線上一致。`civ-reveal` 只在 `html.civ-motion` 下把摺下內容以透明度 0 等候進視窗，階 1 帶 `is-inview`，1.5s 後 boot 會拆掉未接上的 motion class。呢套夠用。任何新時間軸、平滑捲動庫、或把透明度 0 擴到扉頁，都標 **閘風險**（鎖稿禁止 gsap／lenis；開場 wire 另有 HOLD）。

---

## 3. Top 5 must-do this week

1. **`questions-by-volume`** — 總覽問題索引按古／今／未來分三組。只動 `questions.ts` 的渲染，錨不變。無檔案撞車，本週可以先合。
2. **`chronicle-jump-volumes-first`** — 編年頁頂只留三卷跳轉；十階 chip 留在各卷扉頁內。等 `#227` 再 `#223` 落地後做，避免三份 `chronicle.ts` 對撞。
3. **`home-volume-before-monitor`** — 三卷卡放到監測鐘前面。唔好寫進 `#241`。HOLD 未解就另開一只唔掂開場的小 PR。
4. **`axis-today-gloss`** — 軸下加一句：今天＝新聞切片，章名＝今。同第 3 項同一條首頁小 PR。
5. **`vol3-static-monitor-cite`** — 卷三扉頁連結 `/#monitor`；首頁「展望見文明總覽」加高到 44。數字留在鐘模組。同 PR 可加編年去開蒙的一句。唔改 `future.ts`。

---

## 4. 唔做

- 唔合併 `#241`。PP O HOLD。唔為 LCP 把十二秒開場一併合入。`#238` 已在 wire 內，唔好 `#238` 同 `#241` 兩邊都合。
- 唔把今次 headless 描述當成 TRAP-V08、站級三席票、或新的 Lighthouse 數字。FIX-BRIEF 的 4.4s／5.4s 繼續用原紀錄。
- 唔再開卷一正文。`#224` 已有；未解「古凍結」之前唔當新工作。
- 唔把 F1–F6 全文搬進編年，唔開 `/civilization/future/`，唔加第十一階，唔刪 `#stage-N`。
- 唔把三頁同款三卷卡改成三套文案。同款卡係 P0 決定。
- 唔引入 gsap／lenis；鐘唔加秒針；唔把「1 分 29 秒」寫進未來正文。
- 唔做會員牆。站上無會員產品，只有訂閱。
- 唔重寫開蒙樹（`#225`／`#232` 已有），唔改 AdSense 同新聞 pipeline。
- 唔把階 6–10 的加厚、宇宙加厚、總覽未來加厚再寫一次（`#227` `#223` `#234` `#233`）。
- 唔把深讀塊摺進 `<details>`，以免加厚正文被藏起。
- 唔把 kicker 改成墨色去「修」2.16。畫面已經在深底上，約 7:1。計分差由 `#228` 的 `background-color` 處理。

---

## 5. Suggested merge order

檔案鎖：`chronicle.ts`＝`#227`、`#223`、`#224`。`future.ts`＝`#233`。`cosmos.ts`＝`#234`。`App.tsx`／`App.css`／開場＝`#228`、`#240`、`#238`、`#241`，加上開蒙 `#225`／`#232`。

1. **`#228`**（對比計分底色 + 開蒙 44）。細，而且線上重設鈕仍係 30px 高。先合。
2. **`#240`**（新頭條 chip 離開卷卡）。同 `#228` 都掂 `App.css`，`#228` 之後 rebase。
3. **`#227` 然後 `#223`**。今章先完成。兩份都改 `chronicle.ts`，必須串行。階 10 在主幹已過 400 字同四條 https；`#223` 係再加厚，仍然屬於「今加厚」。
4. **`#233`** 同 **`#234`** 可以同第 3 步平行（唔同檔）。面板留在總覽。宇宙回程若要指 `#ch-ancient`，等 `#234` 合完。
5. **`#224` 最後，而且要 PP O 寫明解除古凍結。** 否則留住唔合。合的話 rebase 到 `#227`+`#223` 之上。
6. **開蒙：`#225` 同 `#232` 揀一條線。** `#232` 係較大的課程樹（taxonomy v2）。先對齊再合其中一條，另一條收掉或併入。唔好兩條先後合上 main。
7. **`#241` 繼續 HOLD。** LCP 要獨立於十二秒開場先至可以合；否則連 `#238` 都唔好單獨再合一次。
8. **新工作：** 第 3 節第 1 項（問題索引）隨時可開。第 2–5 項等上面的 `chronicle.ts`／`App.tsx` 鎖放開。搬卷三全文、字數比例閘、三卷封面，留在鎖稿 P1／P2，唔塞本週。

---

## 6. 量測備註

| 面 | 390 寬文件橫向 | 文高 | 備註 |
| --- | --- | --- | --- |
| `/` | 390＝390 | 約 7,600px | 三卷頂 1332；鐘頂 1163；軸頂 874；開場高 709。LCP 元素 `.axis-vignette`。 |
| `/civilization/` | 390＝390 | 約 27,000px | 三張卷卡；無十階卡、無 `.chronicle-strip`。LCP 元素同一張軸圖。無監測鐘。 |
| `/civilization/chronicle/` | 390＝390 | 約 40,000px | `#ch-*` 同 `#stage-1`…`10` 都在。頁頂 nav：3 粒 + 10 粒，換行。 |
| `/civilization/cosmos/` | 390＝390 | 約 10,700px | 有回編年；無三卷錨。 |
| `/civilization/origins/` | 390＝390 | — | 有回編年。 |
| `/learn/` | 360＝360 | — | 「重設本機進度」112×30。 |
| `/civilization/#future` | 390＝390 | 同總覽 | `#future` 在總覽，編年用連結過去，無把面板搬走。 |
