import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Database, Trash2, RefreshCw } from "lucide-react";

export const NameCleanup = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  const runDryRun = async () => {
    setLoading(true);
    setProgress(30);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-duplicate-names', {
        body: { dryRun: true }
      });

      setProgress(100);

      if (error) throw error;

      setStats(data.stats);
      toast({
        title: "Dry Run Complete",
        description: `Found ${data.stats.duplicatesToDelete} duplicates and ${data.stats.lowOccurrenceToDelete} low-occurrence names to remove.`,
      });
    } catch (error: any) {
      console.error('Dry run error:', error);
      toast({
        title: "Dry Run Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const executeCleanup = async () => {
    if (!stats) {
      toast({
        title: "Run Dry Run First",
        description: "Please run a dry run before executing cleanup.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`This will delete ${stats.duplicatesToDelete + stats.lowOccurrenceToDelete} records and cannot be undone. Continue?`)) {
      return;
    }

    setLoading(true);
    
    // Simulate progress during the long operation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return 90; // Cap at 90% until completion
        return prev + 5;
      });
    }, 2000); // Update every 2 seconds

    try {
      setProgress(10);
      
      const { data, error } = await supabase.functions.invoke('cleanup-duplicate-names', {
        body: { dryRun: false }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      toast({
        title: "Cleanup Complete!",
        description: data.message,
      });

      setStats(data.stats);
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('Cleanup error:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message || "An error occurred during cleanup. Check the edge function logs for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Name Database Cleanup
        </CardTitle>
        <CardDescription>
          Merge duplicate names and remove entries with less than 50 total occurrences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runDryRun} 
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Run Dry Run
          </Button>
          <Button 
            onClick={executeCleanup} 
            disabled={loading || !stats}
            variant="destructive"
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Execute Cleanup
          </Button>
        </div>

        {loading && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {progress < 20 && 'Loading names from database...'}
              {progress >= 20 && progress < 40 && 'Analyzing duplicates...'}
              {progress >= 40 && progress < 60 && 'Deleting duplicate records...'}
              {progress >= 60 && progress < 90 && 'Updating merged records...'}
              {progress >= 90 && 'Finalizing cleanup...'}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              This may take several minutes. Please don't close this page.
            </p>
          </div>
        )}

        {stats && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold">Cleanup Statistics</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total Names:</div>
              <div className="font-mono">{stats.totalProcessed}</div>
              
              <div>Unique Names:</div>
              <div className="font-mono">{stats.uniqueNames}</div>
              
              <div>Duplicates to Delete:</div>
              <div className="font-mono text-destructive">{stats.duplicatesToDelete}</div>
              
              <div>Low Occurrence (&lt;50):</div>
              <div className="font-mono text-destructive">{stats.lowOccurrenceToDelete}</div>
              
              <div className="font-semibold">Final Name Count:</div>
              <div className="font-mono font-semibold text-primary">{stats.finalNameCount}</div>
            </div>

            {stats.actualUpdated !== undefined && (
              <div className="mt-4 pt-4 border-t">
                <h5 className="font-semibold mb-2">Execution Results</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Names Updated:</div>
                  <div className="font-mono text-green-600">{stats.actualUpdated}</div>
                  
                  <div>Records Deleted:</div>
                  <div className="font-mono text-red-600">{stats.actualDeleted}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
