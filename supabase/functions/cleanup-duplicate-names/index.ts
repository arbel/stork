import { corsHeaders } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/auth.ts'

interface NameGroup {
  name: string;
  records: any[];
  totalMale: number;
  totalFemale: number;
  totalOccurrences: number;
  winningRecord: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only authenticated admins may run this destructive catalog cleanup.
    const gate = await requireAdmin(req);
    if ('errorResponse' in gate) return gate.errorResponse;
    const supabaseAdmin = gate.admin;

    const { dryRun = true } = await req.json();

    console.log(`Starting cleanup process (dryRun: ${dryRun})`);

    // Fetch all Hebrew names in smaller batches
    let allNames: any[] = [];
    let from = 0;
    const pageSize = 500; // Reduced batch size
    let hasMore = true;

    while (hasMore) {
      console.log(`Loading names: ${from} to ${from + pageSize - 1}`);
      
      const { data, error } = await supabaseAdmin
        .from('names')
        .select('*')
        .eq('language', 'he')
        .eq('region', 'IL')
        .range(from, from + pageSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allNames = [...allNames, ...data];
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    console.log(`Loaded ${allNames.length} Hebrew names`);

    // Group names by name
    const nameGroups = new Map<string, any[]>();
    for (const record of allNames) {
      const existing = nameGroups.get(record.name) || [];
      existing.push(record);
      nameGroups.set(record.name, existing);
    }

    console.log(`Found ${nameGroups.size} unique names`);

    // Process each group
    const mergedNames: NameGroup[] = [];
    const namesToDelete: string[] = [];
    const lowOccurrenceNames: string[] = [];

    for (const [name, records] of nameGroups.entries()) {
      // Calculate total occurrences
      const totalMale = records.reduce((sum, r) => sum + (r.male_occurrences || 0), 0);
      const totalFemale = records.reduce((sum, r) => sum + (r.female_occurrences || 0), 0);
      const totalOccurrences = totalMale + totalFemale;

      // Skip names with low occurrences
      if (totalOccurrences < 50) {
        lowOccurrenceNames.push(...records.map(r => r.id));
        continue;
      }

      // Find winning record (highest individual occurrences)
      const winningRecord = records.reduce((best, current) => {
        const currentTotal = (current.male_occurrences || 0) + (current.female_occurrences || 0);
        const bestTotal = (best.male_occurrences || 0) + (best.female_occurrences || 0);
        return currentTotal > bestTotal ? current : best;
      });

      // Determine final gender based on total occurrences
      let finalGender = 'unisex';
      if (totalMale > totalFemale * 2) {
        finalGender = 'male';
      } else if (totalFemale > totalMale * 2) {
        finalGender = 'female';
      }

      mergedNames.push({
        name,
        records,
        totalMale,
        totalFemale,
        totalOccurrences,
        winningRecord: {
          ...winningRecord,
          male_occurrences: totalMale,
          female_occurrences: totalFemale,
          gender: finalGender,
          popularity_score: totalOccurrences
        }
      });

      // Mark other records for deletion if there are duplicates
      if (records.length > 1) {
        const duplicateIds = records
          .filter(r => r.id !== winningRecord.id)
          .map(r => r.id);
        namesToDelete.push(...duplicateIds);
      }
    }

    console.log(`Names to merge: ${mergedNames.length}`);
    console.log(`Duplicate records to delete: ${namesToDelete.length}`);
    console.log(`Low occurrence names to delete: ${lowOccurrenceNames.length}`);

    const stats = {
      totalProcessed: allNames.length,
      uniqueNames: nameGroups.size,
      namesToMerge: mergedNames.length,
      duplicatesToDelete: namesToDelete.length,
      lowOccurrenceToDelete: lowOccurrenceNames.length,
      finalNameCount: mergedNames.length,
      dryRun
    };

    // If dry run, just return stats
    if (dryRun) {
      return new Response(
        JSON.stringify({ 
          success: true,
          stats,
          message: 'Dry run complete - no changes made'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute cleanup
    let updateCount = 0;
    let deleteCount = 0;
    const batchSize = 50; // Smaller batches to avoid timeout

    console.log(`Starting deletion of ${namesToDelete.length} duplicates and ${lowOccurrenceNames.length} low occurrence names`);

    // FIRST: Delete duplicates in batches (BEFORE updating winning records)
    for (let i = 0; i < namesToDelete.length; i += batchSize) {
      const batch = namesToDelete.slice(i, i + batchSize);
      console.log(`Deleting duplicate batch ${i / batchSize + 1}/${Math.ceil(namesToDelete.length / batchSize)}`);
      
      const { error } = await supabaseAdmin
        .from('names')
        .delete()
        .in('id', batch);

      if (error) {
        console.error(`Error deleting batch ${i / batchSize + 1}:`, error);
      } else {
        deleteCount += batch.length;
        console.log(`Deleted ${deleteCount}/${namesToDelete.length} duplicates`);
      }
    }

    // Delete low occurrence names in batches
    for (let i = 0; i < lowOccurrenceNames.length; i += batchSize) {
      const batch = lowOccurrenceNames.slice(i, i + batchSize);
      console.log(`Deleting low occurrence batch ${i / batchSize + 1}/${Math.ceil(lowOccurrenceNames.length / batchSize)}`);
      
      const { error } = await supabaseAdmin
        .from('names')
        .delete()
        .in('id', batch);

      if (error) {
        console.error(`Error deleting low occurrence batch ${i / batchSize + 1}:`, error);
      } else {
        deleteCount += batch.length;
        console.log(`Total deleted: ${deleteCount}`);
      }
    }

    console.log(`Starting update of ${mergedNames.length} merged names`);

    // SECOND: Now update the winning records (after duplicates are deleted)
    const updateBatchSize = 50;
    for (let i = 0; i < mergedNames.length; i += updateBatchSize) {
      const batch = mergedNames.slice(i, i + updateBatchSize);
      console.log(`Updating batch ${i / updateBatchSize + 1}/${Math.ceil(mergedNames.length / updateBatchSize)}`);
      
      for (const group of batch) {
        const { error } = await supabaseAdmin
          .from('names')
          .update({
            male_occurrences: group.winningRecord.male_occurrences,
            female_occurrences: group.winningRecord.female_occurrences,
            gender: group.winningRecord.gender,
            popularity_score: group.winningRecord.popularity_score,
            updated_at: new Date().toISOString()
          })
          .eq('id', group.winningRecord.id);

        if (error) {
          console.error(`Error updating ${group.name}:`, error);
        } else {
          updateCount++;
        }
      }
      
      console.log(`Updated ${updateCount}/${mergedNames.length} names`);
    }

    console.log(`Cleanup complete: ${updateCount} updated, ${deleteCount} deleted`);

    return new Response(
      JSON.stringify({ 
        success: true,
        stats: {
          ...stats,
          actualUpdated: updateCount,
          actualDeleted: deleteCount
        },
        message: `Successfully merged ${updateCount} names and deleted ${deleteCount} records`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cleanup-duplicate-names function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
