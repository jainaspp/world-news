import type { Topic } from '../../shared/topics';
import type { UiLang } from '../../shared/zh';
import { t } from '../../shared/i18n';

export function TrendingTopics({ topics, active, onPick, lang = 'zh-HK' }: { topics: Topic[]; active: string; onPick: (term: string) => void; lang?: UiLang }) {
  if (!topics.length) return null;
  const label = t('keywords', lang);
  return (
    <section className="topics" id="hot-search" aria-label={label}>
      <h2 className="topics-title">{label}</h2>
      <div className="topics-row">
        {topics.map((topic, index) => (
          <button
            type="button"
            key={topic.term}
            className={active === topic.term ? 'chip topic active' : 'chip topic'}
            aria-pressed={active === topic.term}
            onClick={() => onPick(active === topic.term ? '' : topic.term)}
          >
            <span className="topic-rank">{index + 1}</span>
            {topic.term}
            <span className="topic-count">{topic.outlets}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
