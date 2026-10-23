# Critical count — Kimi K3, PR #241

**Critical＝3**

| # | ID | 頁 | 視口 | 主題 | 結果 |
| --- | --- | --- | --- | --- | --- |
| 1 | `P0-TOUCH-44` | H `/` | 360、390、414 | 淺色與暗色；另含減動態與十二秒 settle | FAIL。英雄主按鈕與「向下滾動，開始編年」邊緣 4px，門檻 8px。可點盒高都是 44 |
| 2 | `P1-PERF` → P0（§7.2，#198 豁免列 1） | H `/` | M，Lighthouse 412×823，simulated 4G | 淺色（Lighthouse 預設） | FAIL。LCP **4351 ms**。元素 `h2.hero-title`。門檻 2.5s |
| 3 | `P1-PERF` → P0（§7.2，#198 豁免列 2） | C `/civilization/` | M，Lighthouse 412×823，simulated 4G | 淺色（Lighthouse 預設） | FAIL。LCP **5702 ms**。元素 `div.axis-vignette`。門檻 2.5s |

`TRAP-V08` 是陷阱 FAIL，不計入這個數目。整閘仍然 FAIL。
