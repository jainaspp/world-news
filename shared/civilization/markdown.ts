import { esc } from '../contentPage.js';

function inline(raw: string): string {
  const tokens: string[] = [];
  const hold = (html: string) => {
    tokens.push(html);
    return `\u0000${tokens.length - 1}\u0000`;
  };
  let text = raw;
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
    if (!href.startsWith('/') && !href.startsWith('https://')) return label;
    return hold(`<a href="${esc(href)}">${esc(label)}</a>`);
  });
  text = text.replace(/\*\*([^*]+)\*\*/g, (_match, value: string) => hold(`<strong>${esc(value)}</strong>`));
  text = text.replace(/\*([^*]+)\*/g, (_match, value: string) => hold(`<em>${esc(value)}</em>`));
  text = text.replace(/`([^`]+)`/g, (_match, value: string) => hold(`<code>${esc(value)}</code>`));
  text = esc(text);
  return text.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => tokens[Number(index)] ?? '');
}

function isRuleRow(line: string): boolean {
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

/** Headings, paragraphs, lists and tables. Enough for the origins longform. */
export function renderMildMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (index < lines.length && (lines[index] ?? '').trim().startsWith('|')) {
        const raw = lines[index] ?? '';
        if (!isRuleRow(raw)) {
          const cells = raw.split('|').slice(1, -1).map((cell) => cell.trim());
          if (cells.some(Boolean)) rows.push(cells);
        }
        index += 1;
      }
      const [head, ...body] = rows;
      if (head) {
        const headHtml = head.map((cell) => `<th>${inline(cell)}</th>`).join('');
        const bodyHtml = body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('');
        html.push(`<table class="civ-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`);
      }
      continue;
    }
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (index < lines.length && (lines[index] ?? '').startsWith('- ')) {
        items.push(inline((lines[index] ?? '').slice(2)));
        index += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`);
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 2;
      html.push(`<h${level}>${inline(heading[2] ?? '')}</h${level}>`);
      index += 1;
      continue;
    }
    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length) {
      const next = lines[index] ?? '';
      if (!next.trim() || /^(#{1,3}\s|- |\s*\|)/.test(next)) break;
      paragraph.push(next.trim());
      index += 1;
    }
    html.push(`<p>${inline(paragraph.join(''))}</p>`);
  }
  return html.join('\n');
}
