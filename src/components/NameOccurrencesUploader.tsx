import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const NameOccurrencesUploader = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ processed: 0, total: 0 });
  const { toast } = useToast();

  const parseFile = (content: string, isTSV: boolean): Array<{ name: string; occurrences: number }> => {
    const lines = content.trim().split('\n');
    
    return lines.map(line => {
      if (isTSV) {
        // Simple TSV parsing
        const [name, occurrencesStr] = line.split('\t');
        const cleanNumber = occurrencesStr?.replace(/[",]/g, '');
        return {
          name: name?.trim() || '',
          occurrences: parseInt(cleanNumber) || 0
        };
      } else {
        // CSV parsing for Hebrew names with potential quoted numbers
        // Format: name,123 or name,"1,234"
        
        // Find the comma that separates name from number
        // If there's a quote, find the comma before the quote
        // Otherwise, find the last comma
        let separatorIndex: number;
        const quoteIndex = line.indexOf('"');
        
        if (quoteIndex !== -1) {
          // There's a quote, so find the comma right before it
          separatorIndex = line.lastIndexOf(',', quoteIndex);
        } else {
          // No quote, just find the last comma
          separatorIndex = line.lastIndexOf(',');
        }
        
        if (separatorIndex === -1) {
          console.warn('Could not parse line (no comma):', line);
          return { name: '', occurrences: 0 };
        }
        
        const name = line.substring(0, separatorIndex).trim();
        const occurrencesStr = line.substring(separatorIndex + 1).trim();
        
        // Remove quotes and commas from numbers (e.g., "8,593" -> 8593)
        const cleanNumber = occurrencesStr.replace(/[",]/g, '');
        const occurrences = parseInt(cleanNumber);
        
        if (!name || isNaN(occurrences)) {
          console.warn('Could not parse line:', line);
          return { name: '', occurrences: 0 };
        }
        
        return {
          name: name,
          occurrences: occurrences
        };
      }
    }).filter(item => item.name && item.occurrences > 0);
  };

  const handleFileUpload = async (files: FileList | null, gender: 'male' | 'female') => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const isTSV = file.name.endsWith('.tsv');
    
    try {
      setIsProcessing(true);
      setProgress(10);
      setProcessingLogs([]);
      setResults(null);

      const content = await file.text();
      const parsedData = parseFile(content, isTSV);

      setProgress(20);
      setProcessingLogs([`📊 Parsed ${parsedData.length} ${gender} names from ${file.name}`]);
      setStats({ processed: 0, total: parsedData.length });

      // Process in larger batches for better performance
      const BATCH_SIZE = 500;
      const batches = [];
      for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
        batches.push(parsedData.slice(i, i + BATCH_SIZE));
      }

      setProcessingLogs(prev => [...prev, `🔄 Processing in ${batches.length} batches of up to ${BATCH_SIZE} names each...`]);

      let totalProcessed = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const namesData = batch.map(item => ({
          name: item.name,
          occurrences: item.occurrences,
          gender
        }));

        setProcessingLogs(prev => [...prev, `⏳ Processing batch ${i + 1}/${batches.length} (${namesData.length} names)...`]);

        // Call edge function for this batch
        const { data, error } = await supabase.functions.invoke('update-name-occurrences', {
          body: { names: namesData }
        });

        if (error) {
          setProcessingLogs(prev => [...prev, `❌ Error in batch ${i + 1}: ${error.message}`]);
        } else {
          totalProcessed += data.processed || 0;
          
          setProcessingLogs(prev => [...prev, 
            `✅ Batch ${i + 1} complete: ${data.processed} names processed`
          ]);
        }

        // Update progress
        const processed = (i + 1) * BATCH_SIZE;
        setStats({ processed: Math.min(processed, parsedData.length), total: parsedData.length });
        setProgress(20 + ((i + 1) / batches.length) * 70);
      }

      setProgress(100);
      const finalResults = {
        total: parsedData.length,
        processed: totalProcessed
      };
      setResults(finalResults);

      setProcessingLogs(prev => [...prev, 
        `🎉 Processing complete!`,
        `   Total: ${finalResults.total}`,
        `   ✅ Processed: ${finalResults.processed}`
      ]);

      toast({
        title: "Success!",
        description: `Processed ${finalResults.processed} of ${finalResults.total} names`,
      });

    } catch (error: any) {
      console.error('Error processing file:', error);
      setProcessingLogs(prev => [...prev, `❌ Fatal error: ${error.message}`]);
      toast({
        title: "Error",
        description: error.message || "Failed to process file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setProgress(0);
        setStats({ processed: 0, total: 0 });
      }, 2000);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Upload Name Occurrences</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload CSV/TSV files with Hebrew name occurrences. Format: name, count
        </p>
      </div>

      {isProcessing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>Processing {stats.processed} / {stats.total}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {processingLogs.length > 0 && (
        <div className="bg-muted/50 p-4 rounded-lg max-h-64 overflow-y-auto">
          <p className="font-medium mb-2 text-sm">Activity Log:</p>
          <div className="space-y-1 font-mono text-xs">
            {processingLogs.map((log, index) => (
              <p key={index} className="text-muted-foreground">{log}</p>
            ))}
          </div>
        </div>
      )}

      {results && (
        <div className="bg-muted p-4 rounded-lg space-y-1">
          <p className="font-medium">Results:</p>
          <p className="text-sm">Total in file: {results.total}</p>
          <p className="text-sm text-green-600">Successfully processed: {results.processed}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Button
              variant="outline"
              disabled={isProcessing}
              className="w-full"
              asChild
            >
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Upload Male Names (CSV)
                <input
                  type="file"
                  accept=".csv,.tsv"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files, 'male')}
                  disabled={isProcessing}
                />
              </span>
            </Button>
          </label>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Button
              variant="outline"
              disabled={isProcessing}
              className="w-full"
              asChild
            >
              <span>
                <FileText className="w-4 h-4 mr-2" />
                Upload Female Names (CSV)
                <input
                  type="file"
                  accept=".csv,.tsv"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files, 'female')}
                  disabled={isProcessing}
                />
              </span>
            </Button>
          </label>
        </div>
      </div>
    </Card>
  );
};
