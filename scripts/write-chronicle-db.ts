import { mkdirSync, writeFileSync } from 'node:fs';
import { buildChronicleDb, seedSql } from '../shared/civilization/db/compose.ts';

const db = buildChronicleDb();
mkdirSync('shared/civilization/db', { recursive: true });
writeFileSync('shared/civilization/db/seed.json', `${JSON.stringify(db, null, 2)}\n`);
writeFileSync('shared/civilization/db/seed.ts', `import type { ChronicleDb } from './types.js';\n\nexport const chronicleSeed = ${JSON.stringify(db)} as ChronicleDb;\n`);
writeFileSync('shared/civilization/db/seed.sql', seedSql(db));
const meta = Object.fromEntries(db.meta.map((row) => [row.key, row.value]));
console.log(JSON.stringify({
  threads: db.threads.length,
  entries: db.entries.length,
  sources: db.sources.length,
  before_chronicle: meta.before_chronicle,
  after_chronicle: meta.after_chronicle,
  before_cosmos: meta.before_cosmos,
  after_cosmos: meta.after_cosmos,
  before_earth: meta.before_earth,
  after_earth: meta.after_earth,
  before_galaxy: meta.before_galaxy,
  after_galaxy: meta.after_galaxy,
  before_tech: meta.before_tech,
  after_tech: meta.after_tech,
  before_city: meta.before_city,
  after_city: meta.after_city,
  before_origins: meta.before_origins,
  after_origins: meta.after_origins,
  before_future: meta.before_future,
  after_future: meta.after_future,
}, null, 2));
