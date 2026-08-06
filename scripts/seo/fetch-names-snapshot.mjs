// Pulls the public names catalog from Supabase into a committed JSON snapshot.
// The SEO page generator (generate-seo-pages.mjs) reads this file, so production
// builds don't need DB access. Re-run after changing the catalog:
//   node scripts/seo/fetch-names-snapshot.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')];
    })
);

const URL_BASE = `${env.VITE_SUPABASE_URL}/rest/v1/names`;
const SELECT = 'name,display_name,gender,meaning,origin_category,origin_group,popularity_score';
const PAGE = 1000;

const all = [];
for (let offset = 0; ; offset += PAGE) {
  const res = await fetch(
    `${URL_BASE}?select=${SELECT}&is_active=eq.true&order=name.asc&limit=${PAGE}&offset=${offset}`,
    { headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  all.push(...rows);
  if (rows.length < PAGE) break;
}

const out = join(root, 'scripts', 'seo', 'names-snapshot.json');
writeFileSync(out, JSON.stringify(all, null, 1));
console.log(`Wrote ${all.length} names to ${out}`);
const missing = all.filter((n) => !n.meaning);
console.log(`Missing meaning: ${missing.length}`);
