import { supabase } from '@/integrations/supabase/client';
import type { BabyName } from '@/contexts/SwipeContext';

// PostgREST caps a single response at ~1000 rows by default. If we only read the first page,
// saved swipes that point at names beyond it look "missing" and the name reappears in the deck
// every session (this was the root cause of "כרמי resets after returning to the tab").
// Paginate with .range() until the catalog (~5.8k names) is exhausted.
const PAGE_SIZE = 1000;

// Only the columns formatName() actually maps. select=* roughly doubles the payload with
// ids and audit columns the client never reads (measured: 71 KB → 35 KB per page on the wire).
const NAME_COLUMNS =
  'name,display_name,gender,origin,meaning,language,region,male_occurrences,female_occurrences,origin_category,origin_group';

const formatName = (row: any): BabyName => ({
  name: row.name,
  displayName: row.display_name || undefined,
  origin: row.origin || undefined,
  originCategory: row.origin_category || undefined,
  originGroup: row.origin_group || undefined,
  meaning: row.meaning || undefined,
  gender: row.gender as 'male' | 'female' | 'unisex',
  language: row.language || 'en',
  countries: [row.region || 'US'],
  maleOccurrences: row.male_occurrences ?? 0,
  femaleOccurrences: row.female_occurrences ?? 0,
});

// Search the catalog by (unvocalized) name substring. Requires >= 2 chars. Returns the most
// popular matches first. The user types plain Hebrew, so we match the `name` column (display_name
// carries nikud). % and _ are stripped so user input can't inject ilike wildcards.
export async function searchActiveNames(query: string): Promise<BabyName[]> {
  const q = query.trim().replace(/[%_]/g, '');
  if (q.length < 2) return [];

  const { data, error } = await supabase
    .from('names')
    .select(NAME_COLUMNS)
    .eq('is_active', true)
    .ilike('name', `%${q}%`)
    .order('popularity_score', { ascending: false })
    .limit(60);

  if (error) {
    console.error('Error searching names:', error);
    throw error;
  }

  return (data || []).map(formatName);
}

export async function fetchAllActiveNames(): Promise<BabyName[]> {
  // Count first, then fetch every page CONCURRENTLY. The sequential page loop this replaces
  // cost ~1s per page × 6 pages; now the whole catalog arrives in roughly one round trip.
  const { count, error: countError } = await supabase
    .from('names')
    .select('name', { count: 'exact', head: true })
    .eq('is_active', true);

  if (countError) {
    console.error('Error counting names:', countError);
    throw countError;
  }

  const pages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));

  const results = await Promise.all(
    Array.from({ length: pages }, async (_, i) => {
      const { data, error } = await supabase
        .from('names')
        .select(NAME_COLUMNS)
        .eq('is_active', true)
        .order('name')
        .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error(`Error fetching names page ${i}:`, error);
        throw error;
      }
      return data || [];
    })
  );

  const all = results.flat().map(formatName);
  console.log('Loaded active names catalog:', all.length);
  return all;
}

// ---------------------------------------------------------------------------
// Device cache: the catalog rarely changes, so repeat visits shouldn't pay the
// network cost at all. Freshness stamp = active-row count + latest updated_at —
// one cheap query detects adds/removals (count) and edits (updated_at; the names
// table has an update trigger maintaining it).
// ---------------------------------------------------------------------------

const CACHE_KEY = 'stork:names-cache:v1';

interface CatalogStamp {
  count: number;
  latest: string | null;
}

interface NamesCache {
  stamp: CatalogStamp;
  names: BabyName[];
}

async function fetchCatalogStamp(): Promise<CatalogStamp> {
  const { data, count, error } = await supabase
    .from('names')
    .select('updated_at', { count: 'exact' })
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return { count: count || 0, latest: data?.[0]?.updated_at ?? null };
}

function readNamesCache(): NamesCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NamesCache;
    if (!parsed?.stamp || !Array.isArray(parsed.names) || parsed.names.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeNamesCache(cache: NamesCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    // Quota exceeded / private mode — caching is an optimization, never an error.
    console.warn('Names cache write skipped:', e);
  }
}

/**
 * Cached-first catalog loader. With a cache present it resolves instantly from the device
 * and revalidates in the background, calling `onRefresh` with fresh data only if the catalog
 * actually changed. Without a cache it does the (parallel) network load and seeds the cache.
 */
export async function loadActiveNamesCached(
  onRefresh?: (names: BabyName[]) => void
): Promise<BabyName[]> {
  const cached = readNamesCache();

  if (cached) {
    // Fire-and-forget revalidation — boot never waits on it.
    (async () => {
      try {
        const stamp = await fetchCatalogStamp();
        if (stamp.count === cached.stamp.count && stamp.latest === cached.stamp.latest) return;
        const fresh = await fetchAllActiveNames();
        writeNamesCache({ stamp, names: fresh });
        onRefresh?.(fresh);
      } catch (e) {
        console.warn('Names cache revalidation failed:', e);
      }
    })();
    return cached.names;
  }

  const [stamp, names] = await Promise.all([fetchCatalogStamp(), fetchAllActiveNames()]);
  writeNamesCache({ stamp, names });
  return names;
}
