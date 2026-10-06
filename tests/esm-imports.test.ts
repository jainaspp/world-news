import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function runtimeSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const pattern = /import\s+([\s\S]*?)\s+from\s+['"](\.[^'"]+)['"]/g;
  for (const match of source.matchAll(pattern)) {
    const clause = match[1]?.trim() ?? '';
    const spec = match[2] ?? '';
    if (clause.startsWith('type ')) continue;
    if (clause.startsWith('{') && clause.endsWith('}')) {
      const names = clause
        .slice(1, -1)
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      if (names.length > 0 && names.every((name) => name.startsWith('type '))) continue;
    }
    specs.push(spec);
  }
  return specs;
}

describe('serverless module graph', () => {
  it('uses .js specifiers so Node ESM can load the unbundled function', () => {
    const offenders: string[] = [];
    for (const file of ['api', 'server', 'shared', 'functions'].flatMap((dir) => walk(dir))) {
      if (!file.endsWith('.ts')) continue;
      for (const spec of runtimeSpecifiers(readFileSync(file, 'utf8'))) {
        if (!spec.endsWith('.js')) offenders.push(`${file} -> ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
