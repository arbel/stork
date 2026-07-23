import { supabase } from '@/integrations/supabase/client';
import type { BabyName } from '@/contexts/SwipeContext';

// PostgREST caps a single response at ~1000 rows by default. If we only read the first page,
// saved swipes that point at names beyond it look "missing" and the name reappears in the deck
// every session (this was the root cause of "כרמי resets after returning to the tab").
// Paginate with .range() until the catalog (~5.8k names) is exhausted.
const PAGE_SIZE = 1000;

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
    .select('*')
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
  const all: BabyName[] = [];
  let from = 0;

  // Loop until a page returns fewer than PAGE_SIZE rows.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from('names')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching names:', error);
      throw error;
    }

    if (!data || data.length === 0) break;

    all.push(...data.map(formatName));

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log('Loaded active names catalog:', all.length);
  return all;
}
