/** Chronicle content database. UI chrome is not part of this shape. */

export interface ChronicleThread {
  id: string;
  slug: string;
  title: string;
  lede: string;
  sort_key: number;
  path: string;
  ai_note: string;
}

export interface ChronicleEntry {
  id: string;
  thread_id: string;
  slug: string;
  title: string;
  summary: string;
  /** Markdown. Headings may end with `{#anchor}`. */
  body: string;
  sort_key: number;
  time_label: string;
  parent_slug: string | null;
  also_id: string | null;
}

export interface ChronicleSource {
  thread_id: string;
  entry_slug: string | null;
  name: string;
  url: string;
  note: string;
}

export interface ChronicleMeta {
  key: string;
  value: string;
}

/** Real observation or museum photograph, or a labeled schematic. */
export interface ChronicleFigure {
  id: string;
  kind: 'real_photo' | 'ai_illustration';
  volume: string;
  near_entry: string;
  /** Insert after the first heading whose text contains this phrase. */
  after_heading?: string;
  /** When false, the record stays in the seed but the page already shows the image. */
  embed: boolean;
  src: string;
  width: number;
  height: number;
  caption_zh: string;
  source_org: string;
  title: string;
  license: string;
  source_url: string;
  retrieved: string;
  credit: string;
  alt_zh: string;
  not_ai: boolean;
}

export interface ChronicleDb {
  meta: ChronicleMeta[];
  threads: ChronicleThread[];
  entries: ChronicleEntry[];
  sources: ChronicleSource[];
  figures: ChronicleFigure[];
}

/** Minimal D1 surface. Pages keep reading the seed until this binding exists. */
export interface ChronicleD1 {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
    };
  };
}
