import { rankHeatCount } from '../../shared/homeTemplate';
import { t } from '../../shared/i18n';
import type { NewsItem } from '../../shared/types';
import { titleLang, type UiLang } from '../../shared/zh';
import { timeAgo } from '../utils/time';
import { trackRead } from '../utils/trackRead';
import { safeUrl } from '../utils/url';

interface Props {
  items: NewsItem[];
  counts: Map<string, number>;
  breaking: Set<string>;
  explainers: Map<string, string>;
  titleOf: (item: NewsItem) => string;
  lang: UiLang;
  start?: number;
}

export function RankedList({ items, counts, breaking, explainers, titleOf, lang, start = 0 }: Props) {
  return (
    <ol className="rank-list" aria-label={t('rankListLabel', lang)}>
      {items.map((item, index) => {
        const rank = start + index + 1;
        const title = titleOf(item);
        const script = titleLang(title);
        const langAttr = script === 'zh' ? (lang === 'zh-CN' ? 'zh-CN' : 'zh-HK') : script;
        const href = safeUrl(item.link);
        const heat = rankHeatCount(counts.get(item.id) ?? 0);
        const when = item.pubDate ? timeAgo(item.pubDate) : '';
        const badge = breaking.has(item.id) ? t('breaking', lang) : '';
        const pack = explainers.get(item.id) || '';
        const open = () => trackRead(item.id);
        return (
          <li key={item.id} className={rank <= 3 ? 'rank-row rank-row-top' : 'rank-row'}>
            <span className="rank-num" aria-hidden="true">{rank}</span>
            <div className="rank-main">
              {href ? (
                <a className="rank-title" href={href} lang={langAttr} title={title} target="_blank" rel="noopener noreferrer" onClick={open}>
                  {title}
                </a>
              ) : (
                <span className="rank-title" lang={langAttr} title={title}>{title}</span>
              )}
              {pack ? <a className="rank-pack" href={pack}>{t('packLink', lang)}</a> : null}
              <span className="rank-note">
                <span className="source-tag">{item.source}</span>
                {when ? <time dateTime={item.pubDate}>{when}</time> : null}
              </span>
              {badge ? <span className="rank-badge">{badge}</span> : null}
            </div>
            <div className="rank-side">
              {heat != null ? (
                <a className="rank-heat" href={`/story/${item.id}/`} aria-label={`${heat} ${t('outlets', lang)}`}>{heat}</a>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
