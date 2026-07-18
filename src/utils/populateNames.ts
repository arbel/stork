import { supabase } from "@/integrations/supabase/client";
import { BABY_NAMES } from "@/data/babyNames";
import { CLEAN_HEBREW_NAMES } from "@/data/hebrewNamesClean";

export const populateNamesFromData = async () => {
  try {
    // Combine all names from both sources
    const allNames = [...BABY_NAMES];
    
    // Add Hebrew names
    CLEAN_HEBREW_NAMES.forEach(hebrewName => {
      allNames.push({
        name: hebrewName.name,
        displayName: hebrewName.displayName,
        origin: "Hebrew",
        meaning: hebrewName.meaning || "",
        gender: hebrewName.gender,
        language: "he",
        countries: ["IL"]
      });
    });

    // Transform and prepare names for database insertion
    const namesToInsert = allNames.map(name => ({
      name: name.name,
      display_name: name.displayName || null,
      gender: name.gender,
      origin: name.origin || null,
      meaning: name.meaning || null,
      description: null,
      language: name.language || 'en',
      region: name.countries?.[0] || 'US',
      popularity_score: 0,
      is_active: true
    }));

    // Insert names in batches to avoid timeout
    const batchSize = 100;
    let insertedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < namesToInsert.length; i += batchSize) {
      const batch = namesToInsert.slice(i, i + batchSize);
      
      try {
        const { error, data } = await supabase
          .from('names')
          .insert(batch);

        if (error) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
          errorCount += batch.length;
        } else {
          insertedCount += batch.length;
          console.log(`Inserted batch ${i / batchSize + 1} successfully`);
        }
      } catch (err) {
        console.error(`Error with batch ${i / batchSize + 1}:`, err);
        errorCount += batch.length;
      }
    }

    return {
      success: true,
      message: `Population completed. Inserted: ${insertedCount}, Errors: ${errorCount}, Total: ${namesToInsert.length}`
    };

  } catch (error: any) {
    console.error('Error populating names:', error);
    return {
      success: false,
      message: error.message
    };
  }
};