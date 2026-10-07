import type { PopularRow } from '../../shared/reads';
import type { UiLang } from '../../shared/zh';
import { t } from '../../shared/i18n';
import { safeUrl } from '../utils/url';
import { trackRead } from '../utils/trackRead';

interface Props {
  rows: PopularRow[];
  variant: 'feed' | 'side';
  lang?: UiLang;
}

/** Desktop sidebar list, and a compact block that mobile CSS places under the first headline. */
export function MostRead({ rows, variant, lang = 'zh-HK' }: Props) {
  if (!rows.length) return null;
  return (
    <section className={`most-read trending most-read-${variant}`} aria-label={t('mostRead', lang)}>
      <h2>{t('mostRead', lang)}</h2>
      <ol>
        {rows.map((row, index) => {
          const href = safeUrl(row.link) || `/story/${row.id}/`;
          const note = row.fallback
            ? (lang === 'en' ? `${row.outlets} outlets` : `${row.outlets} 間媒體`)
            : (lang === 'en' ? `${row.count}` : `${row.count} 次`);
          return (
            <li key={`${variant}-${row.id}`}>
              <span className="rank">{index + 1}</span>
              <div>
                <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => trackRead(row.id)}>
                  {row.title}
                </a>
                <span className="cluster-badge">{note}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
