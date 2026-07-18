import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface NameOccurrence {
  name: string;
  occurrences: number;
  gender: 'male' | 'female';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { names } = await req.json() as { names: NameOccurrence[] };

    if (!names || !Array.isArray(names) || names.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No names provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing ${names.length} names - updating occurrences`);

    let processedCount = 0;
    const errors: string[] = [];

    // Process each name individually to properly update occurrences
    for (const { name, occurrences, gender } of names) {
      try {
        // Find existing record(s) for this name (any gender)
        const { data: existingNames, error: findError } = await supabaseAdmin
          .from('names')
          .select('*')
          .eq('name', name)
          .eq('language', 'he')
          .eq('region', 'IL');

        if (findError) {
          console.error(`Error finding name ${name}:`, findError);
          errors.push(`${name}: ${findError.message}`);
          continue;
        }

        if (existingNames && existingNames.length > 0) {
          // Update existing record(s) with the new occurrence count
          for (const existing of existingNames) {
            const updateData = gender === 'male' 
              ? { male_occurrences: occurrences }
              : { female_occurrences: occurrences };

            const { error: updateError } = await supabaseAdmin
              .from('names')
              .update(updateData)
              .eq('id', existing.id);

            if (updateError) {
              console.error(`Error updating ${name}:`, updateError);
              errors.push(`${name}: ${updateError.message}`);
            } else {
              processedCount++;
            }
          }
        } else {
          // Only create new records if occurrences >= 50
          if (occurrences >= 50) {
            const newRecord = {
              name,
              display_name: name,
              gender: 'unisex', // Default to unisex for new records
              language: 'he',
              region: 'IL',
              origin: 'Hebrew',
              male_occurrences: gender === 'male' ? occurrences : 0,
              female_occurrences: gender === 'female' ? occurrences : 0,
              is_active: true
            };

            const { error: insertError } = await supabaseAdmin
              .from('names')
              .insert([newRecord]);

            if (insertError) {
              console.error(`Error inserting ${name}:`, insertError);
              errors.push(`${name}: ${insertError.message}`);
            } else {
              processedCount++;
            }
          } else {
            console.log(`Skipping ${name} - only ${occurrences} occurrences (minimum is 50)`);
          }
        }
      } catch (err) {
        console.error(`Unexpected error processing ${name}:`, err);
        errors.push(`${name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    console.log(`Completed: ${processedCount} names processed successfully`);
    if (errors.length > 0) {
      console.log(`Errors: ${errors.length} names had errors`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        total: names.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-name-occurrences function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
