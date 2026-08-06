// Generates pre-rendered Hebrew SEO pages into dist/ after `vite build`.
// Reads scripts/seo/names-snapshot.json (committed; refresh with fetch-names-snapshot.mjs).
//
// Pages:
//   /שמות/                    hub
//   /שמות-לבנים/ /שמות-לבנות/ /שמות-יוניסקס/   top names per gender
//   /שמות-באות/<letter>/       full catalog, the crawl path that links EVERY name
//   /שמות-מקראיים/ etc.        one page per origin_group
//   /שם/<name>/                5,784 individual name pages
//
// Vercel serves these as static files; the SPA rewrite in vercel.json only
// applies when no file matches, so the app is untouched.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = join(root, 'dist');
const SITE = 'https://www.stork-app.com';
const today = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------- data
const raw = JSON.parse(readFileSync(join(root, 'scripts', 'seo', 'names-snapshot.json'), 'utf8'));

// Merge duplicate rows (same name in two genders — one is a stale 0-popularity row)
const byName = new Map();
for (const n of raw) {
  const prev = byName.get(n.name);
  if (!prev || (n.popularity_score || 0) > (prev.popularity_score || 0)) byName.set(n.name, n);
}
const names = [...byName.values()];

const GENDERS = {
  male: { slug: 'שמות-לבנים', title: 'שמות לבנים', noun: 'הבנים', chip: 'שם לבן' },
  female: { slug: 'שמות-לבנות', title: 'שמות לבנות', noun: 'הבנות', chip: 'שם לבת' },
  unisex: { slug: 'שמות-יוניסקס', title: 'שמות יוניסקס', noun: 'היוניסקס', chip: 'שם יוניסקס' },
};

const ORIGIN_GROUPS = {
  biblical: { slug: 'שמות-מקראיים', title: 'שמות מקראיים', label: 'מקראי' },
  hebrew: { slug: 'שמות-עבריים', title: 'שמות עבריים מודרניים', label: 'עברי / מודרני' },
  ethiopian: { slug: 'שמות-אתיופיים', title: 'שמות אתיופיים', label: 'אתיופי' },
  arabic: { slug: 'שמות-ערביים', title: 'שמות ערביים', label: 'ערבי' },
  sephardi: { slug: 'שמות-ספרדיים', title: 'שמות ספרדיים ולדינו', label: 'ספרדי / לדינו' },
  european: { slug: 'שמות-אירופיים', title: 'שמות אירופיים ולועזיים', label: 'אירופי' },
  slavic: { slug: 'שמות-רוסיים', title: 'שמות רוסיים וסלאביים', label: 'רוסי / סלאבי' },
  yiddish: { slug: 'שמות-ביידיש', title: 'שמות ביידיש', label: 'יידיש' },
  persian_aramaic: { slug: 'שמות-פרסיים', title: 'שמות פרסיים וארמיים', label: 'פרסי / ארמי' },
};

// origin_category tags shown on the swipe card — reuse the same wording
const CATEGORY_LABELS = {
  biblical: 'שם מקראי', nature: 'מעולם הטבע', virtue: 'תכונה ורגש',
  geographic: 'שם מקום', modern: 'עברי מודרני', foreign: 'מקור לועזי',
};

const LETTERS = [...'אבגדהוזחטיכלמנסעפצקרשת'];

// Popularity rank within each gender (only names that were actually given)
const rankIn = {};
for (const g of Object.keys(GENDERS)) {
  const sorted = names.filter((n) => n.gender === g && n.popularity_score > 0)
    .sort((a, b) => b.popularity_score - a.popularity_score);
  sorted.forEach((n, i) => { rankIn[n.name] = { rank: i + 1, of: sorted.length }; });
}

// Related names: neighbors by popularity inside (gender, origin_group), padded from the gender bucket
const buckets = new Map();
const keyOf = (n) => `${n.gender}|${n.origin_group || ''}`;
for (const n of names) {
  for (const k of [keyOf(n), n.gender]) {
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(n);
  }
}
for (const arr of buckets.values()) arr.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
const relatedOf = (n) => {
  const pick = (arr, want) => {
    const i = arr.indexOf(n);
    const out = [];
    for (let d = 1; out.length < want && (i - d >= 0 || i + d < arr.length); d++) {
      if (i - d >= 0) out.push(arr[i - d]);
      if (out.length < want && i + d < arr.length) out.push(arr[i + d]);
    }
    return out;
  };
  const rel = pick(buckets.get(keyOf(n)), 8);
  for (const c of pick(buckets.get(n.gender), 16)) {
    if (rel.length >= 10) break;
    if (c !== n && !rel.includes(c)) rel.push(c);
  }
  return rel.slice(0, 10);
};

// ---------------------------------------------------------------- html helpers
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const display = (n) => n.display_name || n.name;
const nameUrl = (n) => `/שם/${n.name}`;
const href = (p) => encodeURI(p.endsWith('/') ? p : p + '/');
const abs = (p) => SITE + encodeURI(p);
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

const CSS_PATH = '/seo-pages.css';
const CSS = `
:root{--teal:#37B6A6;--teal-dark:#238d80;--ink:#1f3a37;--muted:#5f7a76;--bg:#f6faf9;--card:#ffffff;--line:#dcebe8}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Assistant',system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.65}
a{color:var(--teal-dark);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
header.site{background:var(--card);border-bottom:1px solid var(--line)}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;padding:14px 20px}
.logo{font-weight:800;font-size:1.3rem;color:var(--teal-dark)}
nav.top a{margin-inline-start:18px;font-weight:600}
.crumbs{font-size:.85rem;color:var(--muted);margin:22px 0 6px}
.crumbs a{color:var(--muted)}
h1{font-size:2.2rem;font-weight:800;line-height:1.25}
h1 .nikud{color:var(--teal-dark)}
h2{font-size:1.3rem;font-weight:700;margin:34px 0 12px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.chip{background:#e4f4f1;color:var(--teal-dark);border-radius:999px;padding:3px 14px;font-size:.9rem;font-weight:600}
.lead{font-size:1.15rem;margin:10px 0}
.meta-line{color:var(--muted);margin:6px 0}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;margin:22px 0}
.cta{background:linear-gradient(135deg,#e9f7f5,#f2fbf9);border:1px solid var(--line);border-radius:16px;padding:24px;margin:30px 0;text-align:center}
.cta p{margin-bottom:14px}
.btn{display:inline-block;background:var(--teal);color:#fff;font-weight:700;padding:10px 28px;border-radius:999px}
.btn:hover{background:var(--teal-dark);text-decoration:none}
ul.namelist{list-style:none;columns:2;column-gap:24px}
ul.namelist li{margin:7px 0;break-inside:avoid}
ul.namelist .m{color:var(--muted);font-size:.9rem}
.related{display:flex;flex-wrap:wrap;gap:10px}
.related a{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 16px;font-weight:600}
.letters{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.letters a{background:var(--card);border:1px solid var(--line);border-radius:10px;min-width:40px;text-align:center;padding:6px 0;font-weight:700}
.browse{display:flex;flex-wrap:wrap;gap:10px 22px;margin:8px 0}
footer.site{border-top:1px solid var(--line);margin-top:50px;padding:26px 0;color:var(--muted);font-size:.9rem}
footer.site .links{display:flex;flex-wrap:wrap;gap:8px 20px;margin-bottom:10px}
@media(max-width:560px){h1{font-size:1.7rem}ul.namelist{columns:1}}
`;

function page({ path, title, desc, h1, crumbs, body, ld }) {
  const canonical = abs(path.replace(/\/$/, ''));
  const crumbLd = jsonLd({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(([label, p], i) => ({
      '@type': 'ListItem', position: i + 1, name: label,
      ...(p ? { item: abs(p) } : {}),
    })),
  });
  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:site_name" content="Stork · סטורק">
<meta property="og:locale" content="he_IL">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${CSS_PATH}">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-E5BD18CM2H"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-E5BD18CM2H');</script>
${crumbLd}${ld || ''}
</head>
<body>
<header class="site"><div class="wrap">
<a class="logo" href="/">סטורק</a>
<nav class="top"><a href="${href('/שמות')}">כל השמות</a><a href="/">לאפליקציה</a></nav>
</div></header>
<main class="wrap">
<p class="crumbs">${crumbs.map(([label, p]) => p ? `<a href="${href(p)}">${esc(label)}</a>` : esc(label)).join(' › ')}</p>
<h1>${h1}</h1>
${body}
${CTA}
</main>
<footer class="site"><div class="wrap">
<div class="links">
<a href="${href('/שמות')}">כל השמות</a>
${Object.values(GENDERS).map((g) => `<a href="${href('/' + g.slug)}">${g.title}</a>`).join('\n')}
<a href="/">סטורק — האפליקציה</a>
</div>
<p>סטורק — אפליקציה חינמית לזוגות לבחירת שם לתינוק. המשמעויות נאספו ממקורות פומביים ונוסחו מחדש; ייתכנו אי-דיוקים.</p>
</div></footer>
</body>
</html>`;
  const dir = join(dist, ...path.split('/').filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  return path;
}

const CTA = `<div class="cta">
<p><strong>מתלבטים בין כמה שמות?</strong><br>בסטורק מחליקים על שמות כמו בטינדר — אתם לחוד ובן/בת הזוג לחוד — וכששניכם אוהבים את אותו שם, יש התאמה 🎉</p>
<a class="btn" href="/">מתחילים לבחור שם — חינם</a>
</div>`;

const nameLink = (n, withMeaning = false) =>
  `<a href="${href(nameUrl(n))}">${esc(display(n))}</a>${withMeaning && n.meaning ? ` <span class="m">— ${esc(n.meaning)}</span>` : ''}`;

const urls = [];

// ---------------------------------------------------------------- name pages
for (const n of names) {
  const g = GENDERS[n.gender];
  const og = ORIGIN_GROUPS[n.origin_group];
  const rank = rankIn[n.name];
  const letter = n.name[0];
  const chips = [
    `<span class="chip">${g.chip}</span>`,
    CATEGORY_LABELS[n.origin_category] ? `<span class="chip">${CATEGORY_LABELS[n.origin_category]}</span>` : '',
    og ? `<a class="chip" href="${href('/' + og.slug)}">מוצא ${og.label}</a>` : '',
  ].filter(Boolean).join('');

  const body = `
<div class="chips">${chips}</div>
<p class="lead"><strong>משמעות השם ${esc(n.name)}:</strong> ${esc(n.meaning)}.</p>
${rank ? `<p class="meta-line">השם ${esc(n.name)} נמצא במקום ה-${rank.rank} בפופולריות מתוך ${rank.of.toLocaleString('he')} שמות ${g.noun} בישראל.</p>` : ''}
<h2>שמות דומים ל${esc(n.name)}</h2>
<div class="related">${relatedOf(n).map((r) => `<a href="${href(nameUrl(r))}">${esc(display(r))}</a>`).join('')}</div>
<h2>עוד שמות</h2>
<div class="browse">
<a href="${href('/שמות-באות/' + letter)}">שמות באות ${letter}׳</a>
<a href="${href('/' + g.slug)}">${g.title}</a>
${og ? `<a href="${href('/' + og.slug)}">${og.title}</a>` : ''}
</div>`;

  urls.push(page({
    path: nameUrl(n) + '/',
    title: `משמעות השם ${n.name} — פירוש, מקור ושמות דומים | סטורק`,
    desc: `משמעות השם ${n.name}: ${n.meaning}. ${g.chip}${og ? `, מוצא ${og.label}` : ''}. שמות דומים, פופולריות, ואפליקציה חינמית לבחירת שם ביחד.`,
    h1: `<span class="nikud">${esc(display(n))}</span>`,
    crumbs: [['סטורק', '/'], ['שמות', '/שמות'], [n.name, null]],
    body,
    ld: jsonLd({
      '@context': 'https://schema.org', '@type': 'Article',
      headline: `משמעות השם ${n.name}`, inLanguage: 'he',
      description: n.meaning, mainEntityOfPage: abs(nameUrl(n)),
      author: { '@type': 'Organization', name: 'Stork · סטורק', url: SITE },
    }),
  }));
}

// ---------------------------------------------------------------- gender pages
for (const [key, g] of Object.entries(GENDERS)) {
  const all = buckets.get(key);
  const top = all.filter((n) => n.popularity_score > 0).slice(0, 100);
  const body = `
<p class="lead">${all.length.toLocaleString('he')} ${g.title} עם משמעות ומקור לכל שם. אלו 100 הפופולריים ביותר — את כל השאר מוצאים לפי אות, או מחליקים עליהם באפליקציה.</p>
<h2>100 ${g.title} הפופולריים בישראל</h2>
<ul class="namelist">${top.map((n) => `<li>${nameLink(n, true)}</li>`).join('\n')}</ul>
<h2>כל השמות לפי אות</h2>
<div class="letters">${LETTERS.map((l) => `<a href="${href('/שמות-באות/' + l)}">${l}</a>`).join('')}</div>
<h2>שמות לפי מוצא</h2>
<div class="browse">${Object.values(ORIGIN_GROUPS).map((o) => `<a href="${href('/' + o.slug)}">${o.title}</a>`).join('\n')}</div>`;
  urls.push(page({
    path: `/${g.slug}/`,
    title: `${g.title} — ${all.length.toLocaleString('he')} שמות עם משמעות ומקור | סטורק`,
    desc: `רשימת ${g.title} מלאה: ${all.length.toLocaleString('he')} שמות עם משמעות בעברית ומקור לכל שם, כולל ה-100 הפופולריים בישראל.`,
    h1: g.title,
    crumbs: [['סטורק', '/'], ['שמות', '/שמות'], [g.title, null]],
    body,
  }));
}

// ---------------------------------------------------------------- letter pages (full coverage)
for (const letter of LETTERS) {
  const of = names.filter((n) => n.name[0] === letter);
  if (!of.length) continue;
  const section = (key) => {
    const list = of.filter((n) => n.gender === key)
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    if (!list.length) return '';
    return `<h2>${GENDERS[key].title} באות ${letter}׳</h2>
<ul class="namelist">${list.map((n) => `<li>${nameLink(n, true)}</li>`).join('\n')}</ul>`;
  };
  urls.push(page({
    path: `/שמות-באות/${letter}/`,
    title: `שמות שמתחילים באות ${letter}׳ — לבנים ולבנות, עם משמעות | סטורק`,
    desc: `${of.length.toLocaleString('he')} שמות לתינוק שמתחילים באות ${letter}׳: שמות לבנים, לבנות ויוניסקס עם משמעות ומקור לכל שם.`,
    h1: `שמות באות ${letter}׳`,
    crumbs: [['סטורק', '/'], ['שמות', '/שמות'], [`אות ${letter}׳`, null]],
    body: `<p class="lead">${of.length.toLocaleString('he')} שמות שמתחילים באות ${letter}׳, ממוינים לפי פופולריות.</p>
${section('female')}${section('male')}${section('unisex')}
<h2>אותיות נוספות</h2>
<div class="letters">${LETTERS.filter((l) => l !== letter).map((l) => `<a href="${href('/שמות-באות/' + l)}">${l}</a>`).join('')}</div>`,
  }));
}

// ---------------------------------------------------------------- origin pages
for (const [key, o] of Object.entries(ORIGIN_GROUPS)) {
  const of = names.filter((n) => n.origin_group === key)
    .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
  const top = of.slice(0, 120);
  urls.push(page({
    path: `/${o.slug}/`,
    title: `${o.title} לתינוק — עם משמעות לכל שם | סטורק`,
    desc: `${of.length.toLocaleString('he')} ${o.title} לבנים ולבנות עם משמעות בעברית. הפופולריים ביותר בישראל + חיפוש לפי אות.`,
    h1: `${o.title} לתינוק`,
    crumbs: [['סטורק', '/'], ['שמות', '/שמות'], [o.title, null]],
    body: `<p class="lead">${of.length.toLocaleString('he')} שמות ממוצא ${o.label} בקטלוג של סטורק — אלו הפופולריים ביותר, עם המשמעות של כל שם.</p>
<ul class="namelist">${top.map((n) => `<li>${nameLink(n, true)}</li>`).join('\n')}</ul>
<h2>שמות ממוצא אחר</h2>
<div class="browse">${Object.values(ORIGIN_GROUPS).filter((x) => x !== o).map((x) => `<a href="${href('/' + x.slug)}">${x.title}</a>`).join('\n')}</div>
<h2>כל השמות לפי אות</h2>
<div class="letters">${LETTERS.map((l) => `<a href="${href('/שמות-באות/' + l)}">${l}</a>`).join('')}</div>`,
  }));
}

// ---------------------------------------------------------------- hub
{
  const topOf = (g) => buckets.get(g).filter((n) => n.popularity_score > 0).slice(0, 20);
  urls.push(page({
    path: '/שמות/',
    title: `שמות לתינוק — ${names.length.toLocaleString('he')} שמות עם משמעות ומקור | סטורק`,
    desc: `כל שמות התינוקות במקום אחד: ${names.length.toLocaleString('he')} שמות לבנים, לבנות ויוניסקס עם משמעות בעברית ומקור לכל שם — לפי אות, מוצא ופופולריות.`,
    h1: 'שמות לתינוק — עם משמעות ומקור',
    crumbs: [['סטורק', '/'], ['שמות', null]],
    body: `
<p class="lead">${names.length.toLocaleString('he')} שמות — כל אחד עם משמעות בעברית, מקור ונתוני פופולריות. מחפשים לפי אות, לפי מוצא, או פשוט מחליקים עליהם ביחד באפליקציה.</p>
<h2>לפי קטגוריה</h2>
<div class="browse">${Object.values(GENDERS).map((g) => `<a href="${href('/' + g.slug)}">${g.title}</a>`).join('\n')}</div>
<h2>לפי מוצא</h2>
<div class="browse">${Object.values(ORIGIN_GROUPS).map((o) => `<a href="${href('/' + o.slug)}">${o.title}</a>`).join('\n')}</div>
<h2>לפי אות</h2>
<div class="letters">${LETTERS.map((l) => `<a href="${href('/שמות-באות/' + l)}">${l}</a>`).join('')}</div>
<h2>שמות הבנות הפופולריים</h2>
<div class="related">${topOf('female').map((n) => `<a href="${href(nameUrl(n))}">${esc(display(n))}</a>`).join('')}</div>
<h2>שמות הבנים הפופולריים</h2>
<div class="related">${topOf('male').map((n) => `<a href="${href(nameUrl(n))}">${esc(display(n))}</a>`).join('')}</div>`,
  }));
}

// ---------------------------------------------------------------- css + sitemap
writeFileSync(join(dist, CSS_PATH.slice(1)), CSS.trim());

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${SITE}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>
<url><loc>${SITE}/privacy</loc><lastmod>${today}</lastmod><priority>0.3</priority></url>
${urls.map((p) => `<url><loc>${abs(p.replace(/\/$/, ''))}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>`;
writeFileSync(join(dist, 'sitemap.xml'), sitemap);

console.log(`Generated ${urls.length} pages + sitemap (${names.length} names).`);
