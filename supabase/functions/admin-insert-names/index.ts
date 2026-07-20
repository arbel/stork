import { corsHeaders } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/auth.ts'

interface NameInsert {
  name: string;
  gender: string;
  origin: string;
  meaning?: string;
  language: string;
  region: string;
  is_active: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only authenticated admins may write to the names catalog.
    const gate = await requireAdmin(req);
    if ('errorResponse' in gate) return gate.errorResponse;
    const supabaseAdmin = gate.admin;

    const { names } = await req.json() as { names: NameInsert[] };

    if (!names || !Array.isArray(names) || names.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No names provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Inserting ${names.length} names to database`);
    console.log('Sample names:', names.slice(0, 3));

    // Insert names using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('names')
      .upsert(names, { 
        onConflict: 'name,gender,language,region',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('Database insertion error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Database error: ${error.message}`,
          details: error
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const insertedCount = data ? data.length : 0;
    console.log(`Successfully inserted/updated ${insertedCount} names`);
    console.log('Inserted names sample:', data?.slice(0, 3));

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: insertedCount,
        message: `Successfully processed ${insertedCount} names`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-insert-names function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});