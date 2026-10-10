import { useMemo } from 'react';
import { renderOnThisDaySection } from '../../shared/heritagePage';

/** Same block the server paints under the digest strip. */
export function OnThisDay() {
  const html = useMemo(() => renderOnThisDaySection(new Date()), []);
  if (!html) return null;
  return <div className="heritage-mount" dangerouslySetInnerHTML={{ __html: html }} />;
}
