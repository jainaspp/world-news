import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOTS = ['src', 'shared', 'server', 'api', 'supabase', 'public'];
const EXTRA = ['.gitignore', '.env.example', 'index.html', 'README.md', 'SECURITY.md', 'vercel.json'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return path;
  });
}

describe('repository sources', () => {
  it('does not contain hardcoded credentials', () => {
    const files = [...ROOTS.flatMap((dir) => walk(dir)), ...EXTRA];
    const text = files.map((file) => readFileSync(file, 'utf8')).join('\n');
    expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    expect(text).not.toMatch(/pub_[0-9a-f]{16,}/);
    expect(text).not.toMatch(/wn_cron_secure/);
    const client = walk('src').map((file) => readFileSync(file, 'utf8')).join('\n');
    expect(client).not.toContain('supabase.co');
    expect(client).not.toContain('newsdata.io');
  });
});
