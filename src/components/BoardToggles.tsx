import { t } from '../../shared/i18n';
import type { UiLang } from '../../shared/zh';
import type { BoardBlock, BoardPrefs } from '../hooks/useBoardPrefs';

const ITEMS: { id: BoardBlock; label: 'mostRead' | 'keywords' | 'multiCoverage' }[] = [
  { id: 'mostRead', label: 'mostRead' },
  { id: 'keywords', label: 'keywords' },
  { id: 'coverage', label: 'multiCoverage' },
];

export function BoardToggles({
  prefs,
  onToggle,
  lang,
}: {
  prefs: BoardPrefs;
  onToggle: (block: BoardBlock) => void;
  lang: UiLang;
}) {
  return (
    <div className="board-toggles" role="group" aria-label={t('layout', lang)}>
      {ITEMS.map((item) => (
        <label key={item.id} className="board-check">
          <input type="checkbox" checked={prefs[item.id]} onChange={() => onToggle(item.id)} />
          <span>{t(item.label, lang)}</span>
        </label>
      ))}
    </div>
  );
}
