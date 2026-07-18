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
  meaning: row.meaning || undefined,
  gender: row.gender as 'male' | 'female' | 'unisex',
  language: row.language || 'en',
  countries: [row.region || 'US'],
  maleOccurrences: row.male_occurrences ?? 0,
  femaleOccurrences: row.female_occurrences ?? 0,
});

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
