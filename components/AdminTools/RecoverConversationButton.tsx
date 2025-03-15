"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

/**
 * RecoverConversationButton - Admin tool to manually trigger conversation processing
 * 
 * This component allows administrators to manually process a conversation
 * when the automatic triggers may have failed or need to be rerun.
 */
export function RecoverConversationButton() {
  const [conversationId, setConversationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    actionsPerformed?: {
      conversationFetched: boolean;
      traitsUpdated: boolean;
      skillsCalculated: boolean;
      scenarioCreated: boolean;
    };
  } | null>(null);

  const handleRecover = async () => {
    if (!conversationId.trim()) return;
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/process-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId }),
      });
      
      const data = await response.json();
      setResult({
        success: response.ok,
        message: data.message,
        actionsPerformed: data.actionsPerformed
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-medium mb-2">Recover Conversation</h3>
      <p className="text-sm text-gray-600 mb-4">
        Use this tool to manually process a conversation when automatic triggers may have failed.
      </p>
      
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Enter ElevenLabs Conversation ID"
          value={conversationId}
          onChange={(e) => setConversationId(e.target.value)}
          disabled={isLoading}
        />
        <Button 
          onClick={handleRecover} 
          disabled={isLoading || !conversationId.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing
            </>
          ) : 'Process'}
        </Button>
      </div>
      
      {result && (
        <div className={`p-3 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center mb-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            )}
            <span className={result.success ? 'text-green-700' : 'text-red-700'}>
              {result.message}
            </span>
          </div>
          
          {result.actionsPerformed && (
            <div className="text-sm text-gray-600">
              <p>Actions performed:</p>
              <ul className="list-disc pl-5">
                <li>Conversation fetched: {result.actionsPerformed.conversationFetched ? 'Yes' : 'No'}</li>
                <li>Traits updated: {result.actionsPerformed.traitsUpdated ? 'Yes' : 'No'}</li>
                <li>Skills calculated: {result.actionsPerformed.skillsCalculated ? 'Yes' : 'No'}</li>
                <li>Scenario created: {result.actionsPerformed.scenarioCreated ? 'Yes' : 'No'}</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 