# Mainland / HK source compliance audit — 2026-10-11

**Scope:** `world-news.xyz` HK + mainland (china) pipelines — feeds, category pages, HKG focus, briefings, hk/china explainers, digest/analysis clusters that are hk/china-desk.  
**Not a legal opinion.** Maintainer rule for mainland-facing desks.

## Source list location

| Path | Role |
| --- | --- |
| `repo-cf/shared/feeds.ts` | Canonical `FEEDS[]` RSS/JSON list + `blockedHkChinaOutlet` / `blockedHkChinaStory` |
| `repo-cf/shared/rss.ts` | Ingest: drops blocked hk/china stories |
| `repo-cf/shared/filter.ts` | Category `hk`/`china` + region `HKG` filters |
| `repo-cf/shared/grok.ts` | Briefing picker (`briefingNews`) |
| `repo-cf/shared/focus.ts` | HKG / hk / china focus pages |
| `repo-cf/shared/topicPack.ts` | hk/china desk explainers (`matchTopicItems`) |
| `repo-cf/shared/content.ts` | Digest/analysis skip blocked hk/china clusters |
| `repo-cf/shared/categories.ts` | Stop auto-filing Taiwan titles as `china` |
| `repo-cf/LEGAL.md` | Maintainer note |

## Verdict table (pre-patch → action)

### Removed from `FEEDS` (no longer fetched)

| id | label | was category | reason |
| --- | --- | --- | --- |
| `rfi-zh` | RFI 中文 | world | **PP O example — not compliant**; removed |
| `voa-zh` | 美國之音 | china | Foreign state media; blocked in mainland |
| `rfa-zh` | 自由亞洲 | china | Same class |
| `nyt-zh` | 紐約時報中文 | china | Blocked / sensitive for mainland desk |
| `bbc-zh` | BBC 中文 | china | Chinese service on china desk — excluded |
| `ft-zh` | FT中文 | china | Blocked in mainland |
| `guardian-china` | Guardian 中國 | china | Foreign China desk feed |
| `hkfp` | HKFP | hk | Sensitive for mainland-facing HK desk |
| `dw-zh` | 德國之聲 | world | Same class as RFI; removed from `FEEDS` after confirm. No longer ingested on any desk |

### Replacements added (compliant mainland / state-affiliated)

| id | label | category |
| --- | --- | --- |
| `people-politics` | 人民網時政 | china |
| `xinhua-politics` | 新華社時政 | china |
| `globaltimes` | 環球時報 | china |
| `sina-china` | 新浪大陸 | china |
| `ecns` | 中國新聞網英文 | china |
| `chinanews-scroll` | 中新網滾動 | china |
| `people-world` | 人民網國際 | world (replaces RFI slot) |
| `cgtn-world` | CGTN國際 | world |

### Kept OK on HK / china desks

RTHK, Yahoo 新聞, Now, 有線, 星島, 政府新聞網, 新聞公報, 香港01, 巴士的報, SAI KUNG BUZZ, 港台大中華, 中新網, Sixth Tone, CGTN中國, 界面, Now 兩岸 feed (stories still keyword-filtered).

### International English — kept

| id | label | category | note |
| --- | --- | --- | --- |
| `bbc-world`, `bbc-asia`, `bbc-biz`, … | BBC English | world/asia/… | English international — **kept**. Confirm if site-wide ban wanted. |
| `guardian`, `guardian-biz`, … | Guardian English | world/… | **kept** pending confirm |

`dw-zh` (德國之聲中文) is **not** in this set. It is absent from `FEEDS` and from every HK / mainland / international ingest list. The desk blocklist still matches the label `德國之聲` and hosts `dw.com/zh` / `rss.dw.com`, so a cached headline cannot re-enter hk/china pages.

## Story filters (HK / mainland pipelines)

`blockedHkChinaStory` strips titles/excerpts matching:

- **Taiwan coverage:** 台灣／臺灣／台湾／Taiwan／Taipei／台北／高雄／台南／台中／新北／桃園／民進黨／國民黨／蔡英文／賴清德／馬英九／陳水扁／台獨／兩岸／九二共識／武統／護國神山…
- **Sensitive political:** 六四／天安門事件／Tiananmen／法輪／達賴／Dalai／疆獨／藏獨／港獨／新疆再教育／再教育營／活摘／Free Tibet…

Applied at: RSS ingest (hk/china category), `filterNews`, briefing, HKG/hk/china focus, hk/china topic match, digest/analysis when cluster is hk/china-desk.

Also: removed `/china-taiwan/` from 星島中國 `includePaths`.

## What did **not** change

- Region chip「台灣」page still exists (already emptied of CNA feeds earlier).
- International English feeds (BBC/Guardian/Al Jazeera/…) still on world/business/tech desks.
- `dw-zh` removed from `FEEDS` (2026-10-11 follow-up). RFI / VOA / RFA / NYT CN / BBC CN remain absent.

## Patch branch

`compliance/mainland-hk-sources-2026-10-11` in `repo-cf`.  
Tests: `tests/mainlandCompliance.test.ts` + existing feeds/guards/rss/topic suites green.

## Ask PP O

1. **Delete `dw-zh` (德國之聲) from FEEDS entirely?** Done — no longer ingested.
2. **Site-wide ban BBC/Guardian English too?** (default no — only china/HK desks cleaned)
