"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function RecoverButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleRecover = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/recover-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResults(data);

      if (response.ok) {
        toast({
          title: "Recovery complete",
          description: `Successfully recovered ${data.recoveredCount} conversations.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Recovery failed",
          description: data.message || "An error occurred during recovery.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error during recovery:', error);
      toast({
        title: "Recovery failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleRecover} 
        disabled={isLoading}
        variant="outline"
      >
        {isLoading ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            Recovering...
          </>
        ) : (
          'Recover Missing Data'
        )}
      </Button>

      {results && (
        <div className="text-sm mt-2">
          <p>Processed: {results.results?.length || 0} conversations</p>
          <p>Successfully recovered: {results.recoveredCount}</p>
          {results.results?.some((r: any) => r.status !== 'success') && (
            <details className="mt-2">
              <summary className="cursor-pointer font-medium">Show details</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-[200px]">
                {JSON.stringify(results.results, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
} 