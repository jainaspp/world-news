# 量測方法

席：Grok 4.7  
SHA：`428fe73ca9cd53f3119805b8d36c9ec52ef0fa32`  
日期：2026-10-23

1. 在該 SHA 上 `npm ci` 後 `npm run build`。樣式產物 `dist/assets/index-Fm0TxdTy.css`。
2. 用倉內 `docs/gates/evidence/r8-pack/tooling/serve.mjs` 在 `127.0.0.1:4173` 提供 `dist/`，HTML 走 `injectHomeShell` 與 `renderCivilizationHub`。`loadFeeds` 820 則，首頁用前 16 則。不是 Vite dev。
3. 桌面 Chrome headless（`/usr/local/bin/google-chrome`），puppeteer-core，`deviceScaleFactor` 1。視口 360×800 與 390×844。`localStorage.darkMode` 與 `prefers-color-scheme` 一起設。語言 `zh-HK`。
4. 全長與重疊、品牌、橫向溢出、觸控：`sessionStorage.wn_hero_seen=1`，等 `networkidle0`，在捲動頂部跑正典 §2.4 選擇器，再截全長。
5. 開場播放：清掉 `wn_hero_seen`，`domcontentloaded` 後按頁內 `__WN_HERO_T0` 取樣。減動態用 `prefers-reduced-motion: reduce`，300ms 讀一次。
6. 重疊腳本就是正典那段：`.chrome`、`.axis-title`、`.axis-lede`、`.deep-axis`、`.axis-cta`、`.volume-card`、`.chronicle-band`、`.pattern-axis`、`.case-axis`、`.civ-nav`，另加 `#hero-opening`、`.hero-title`、`.hero-kicker`。父子包含略過。超過 1px 才算。
7. `clipped()` 用正典函數。頁面橫向溢出：`documentElement.scrollWidth > clientWidth + 1`，並用 `scrollingElement.scrollWidth > innerWidth + 1` 覆核。
8. 沒有 iOS Safari，沒有 Android Chrome，沒有雲端真機，沒有 Lighthouse，沒有呼叫付費 xAI API。
