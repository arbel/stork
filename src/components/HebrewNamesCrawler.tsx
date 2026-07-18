import { useState } from 'react';
import { useToast } from "@/hooks/use-toast"; 
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FirecrawlService } from '@/utils/FirecrawlService';
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';

interface HebrewName {
  name: string;
  meaning?: string;
  gender: 'male' | 'female' | 'unisex';
}

export const HebrewNamesCrawler = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [crawledNames, setCrawledNames] = useState<HebrewName[]>([]);
  const [insertedCount, setInsertedCount] = useState(0);
  const [websiteUrls, setWebsiteUrls] = useState('https://www.shemli.co.il/hebnames/index.seam');

  const crawlHebrewNames = async () => {
    setIsLoading(true);
    setProgress(0);
    setCrawledNames([]);
    setInsertedCount(0);
    
    try {
      // Parse URLs from textarea (one per line)
      const urls = websiteUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      if (urls.length === 0) {
        toast({
          title: "Error",
          description: "Please enter at least one URL",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const allNames: HebrewName[] = [];
      let totalInserted = 0;

      // Crawl each URL
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const progressStart = (i / urls.length) * 50;
        const progressEnd = ((i + 1) / urls.length) * 50;
        
        setProgress(progressStart);
        console.log(`Crawling URL ${i + 1}/${urls.length}: ${url}`);
        
        const result = await FirecrawlService.scrapeHebrewNames(url);
        
        if (result.success && result.data) {
          allNames.push(...result.data);
          setProgress(progressEnd);
        } else {
          console.error(`Failed to crawl ${url}:`, result.error);
          toast({
            title: "Warning",
            description: `Failed to crawl ${url}: ${result.error}`,
            variant: "destructive",
          });
        }
      }

      // Remove duplicates
      const uniqueNames = Array.from(
        new Map(allNames.map(name => [`${name.name}-${name.gender}`, name])).values()
      );

      setCrawledNames(uniqueNames);
      setProgress(60);

      // Insert names via Edge Function
      if (uniqueNames.length > 0) {
        const namesToInsert = uniqueNames.map(name => ({
          name: name.name,
          gender: name.gender,
          origin: 'עברית',
          meaning: name.meaning || null,
          language: 'he',
          region: 'IL',
          is_active: true
        }));

        console.log(`Preparing to insert ${namesToInsert.length} names to database`);

        // Insert in batches via Edge Function
        const batchSize = 50;
        let inserted = 0;
        
        for (let i = 0; i < namesToInsert.length; i += batchSize) {
          const batch = namesToInsert.slice(i, i + batchSize);
          const batchProgress = 60 + ((i / namesToInsert.length) * 40);
          setProgress(batchProgress);
          
          try {
            const { data: insertResult, error } = await supabase.functions.invoke('admin-insert-names', {
              body: { names: batch }
            });

            console.log('Batch insertion response:', { insertResult, error });

            if (error) {
              console.error('Function call error:', error);
              toast({
                title: "Database Error", 
                description: `Error inserting batch ${Math.floor(i/batchSize) + 1}: ${error.message}`,
                variant: "destructive"
              });
              continue;
            }
            
            if (insertResult?.success) {
              inserted += insertResult.count || 0;
              totalInserted = inserted;
              setInsertedCount(inserted);
              console.log(`Successfully inserted batch ${Math.floor(i/batchSize) + 1}: ${insertResult.count} names`);
            } else {
              console.error('Batch insertion failed:', insertResult?.error);
              toast({
                title: "Database Error", 
                description: insertResult?.error || 'Unknown error',
                variant: "destructive"
              });
            }
          } catch (batchError) {
            console.error('Batch insertion failed:', batchError);
          }
        }

        toast({
          title: "Success",
          description: `Crawled ${uniqueNames.length} unique names from ${urls.length} URL(s) and inserted ${inserted} new names`,
        });
      }

      setProgress(100);
    } catch (error) {
      console.error('Error crawling Hebrew names:', error);
      toast({
        title: "Error",
        description: "Failed to crawl Hebrew names",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold mb-4">Hebrew Names Crawler</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Crawl Hebrew names from website table (#namesTable) and add them to the database
      </p>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Website URLs (one per line)</label>
        <Textarea
          value={websiteUrls}
          onChange={(e) => setWebsiteUrls(e.target.value)}
          placeholder="Enter website URLs, one per line&#10;https://example.com/page1&#10;https://example.com/page2"
          className="w-full min-h-[120px] font-mono text-sm"
          rows={6}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Enter one URL per line. Each URL will be crawled for Hebrew names.
        </p>
      </div>
      
      <div className="space-y-4">
        {isLoading && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center">
              {progress < 50 ? 'Crawling names...' : progress < 75 ? 'Processing names...' : 'Inserting to database...'}
            </p>
          </div>
        )}
        
        <Button
          onClick={crawlHebrewNames}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Crawling..." : "Crawl Hebrew Names"}
        </Button>

        {crawledNames.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Crawl Results</h4>
            <p>Found {crawledNames.length} unique names</p>
            <p>Inserted {insertedCount} new names to database</p>
            
            <div className="mt-2 max-h-40 overflow-y-auto">
              <p className="text-sm font-medium">Sample names:</p>
              <div className="text-sm space-y-1">
                {crawledNames.slice(0, 10).map((name, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{name.name}</span>
                    <span className="text-muted-foreground">{name.gender}</span>
                  </div>
                ))}
                {crawledNames.length > 10 && (
                  <p className="text-muted-foreground">...and {crawledNames.length - 10} more</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};