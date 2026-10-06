/** Bigger feed images score higher. Uses size hints in the URL; unknown sizes count as medium. */
export function imageScore(url: string): number {
  const hints: number[] = [];
  for (const match of url.matchAll(/(\d{2,4})x(\d{2,4})/g)) hints.push(Number(match[1]));
  for (const match of url.matchAll(/[?&/,_-](?:w|width|im_w|resize)[=_/]?(\d{2,4})/gi)) hints.push(Number(match[1]));
  for (const match of url.matchAll(/\/(\d{3,4})\//g)) hints.push(Number(match[1]));
  const size = hints.filter((value) => value >= 40 && value <= 4000);
  let score = size.length ? Math.max(...size) : 600;
  if (/thumb|small|icon|logo|avatar|\/s\d+\//i.test(url)) score -= 300;
  return score;
}

export function bestImage(sources: { image?: string }[]): string {
  const images = sources.map((source) => source.image || '').filter((url) => /^https?:\/\//.test(url));
  return images.sort((a, b) => imageScore(b) - imageScore(a))[0] || '';
}

