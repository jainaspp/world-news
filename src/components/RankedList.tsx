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
  titleOf: (item: NewsItem) => string;
  lang: UiLang;
}

export function RankedList({ items, counts, breaking, titleOf, lang }: Props) {
  return (
    <ol className="rank-list" aria-label={t('rankListLabel', lang)}>
      {items.map((item, index) => {
        const rank = index + 1;
        const title = titleOf(item);
        const script = titleLang(title);
        const langAttr = script === 'zh' ? (lang === 'zh-CN' ? 'zh-CN' : 'zh-HK') : script;
        const href = safeUrl(item.link);
        const heat = rankHeatCount(counts.get(item.id) ?? 0);
        const when = item.pubDate ? timeAgo(item.pubDate) : '';
        const badge = breaking.has(item.id) ? t('breaking', lang) : '';
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
              {heat != null ? (
                <a className="rank-note" href={`/story/${item.id}/`}>{heat} {t('outlets', lang)}</a>
              ) : when ? (
                <time className="rank-note" dateTime={item.pubDate}>{when}</time>
              ) : null}
            </div>
            {badge ? <span className="rank-badge">{badge}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
