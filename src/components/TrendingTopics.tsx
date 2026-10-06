import type { Topic } from '../../shared/topics';

export function TrendingTopics({ topics, active, onPick }: { topics: Topic[]; active: string; onPick: (term: string) => void }) {
  if (!topics.length) return null;
  return (
    <section className="topics" aria-label="熱搜">
      <h2 className="topics-title">熱搜</h2>
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
