import { useMemo } from 'react';
import { renderTodayPin } from '../../shared/civilizationPage';

/** Paper card pinned under the civilization axis. Same markup as the server render. */
export function OnThisDay() {
  const html = useMemo(() => renderTodayPin(new Date()), []);
  if (!html) return null;
  return <div className="heritage-mount" dangerouslySetInnerHTML={{ __html: html }} />;
}
