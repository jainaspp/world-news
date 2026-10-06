import MiniSearch from 'minisearch';
import { textTokens } from '../shared/text';

export interface SearchRow {
  id: string;
  title: string;
  source: string;
}

export function createSearch(items: SearchRow[]) {
  const mini = new MiniSearch<SearchRow>({
    idField: 'id',
    fields: ['title', 'source'],
    storeFields: ['id'],
    tokenize: (text) => textTokens(text),
  });
  mini.addAll(items);
  return {
    search(query: string): string[] {
      return mini.search(query, { prefix: true, combineWith: 'OR' }).map((result) => String(result.id));
    },
  };
}
