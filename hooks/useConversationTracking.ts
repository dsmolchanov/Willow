// useConversationTracking.ts
"use client";

import { useCallback, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useUser } from '@clerk/nextjs';

const CALL_STATUS = {
  UNKNOWN: 'unknown',
  SUCCESS: 'success',
  FAILURE: 'failure'
} as const;

type CallStatus = typeof CALL_STATUS[keyof typeof CALL_STATUS];

interface ConversationData {
  elevenLabsConversationId: string;
  agentId: string;
  startTime: string;
  endTime?: string;
}

export function useConversationTracking() {
  const [conversationData, setConversationData] = useState<ConversationData | null>(null);
  const supabase = createClientComponentClient();

  const startTracking = useCallback((data: ConversationData) => {
    console.log('Starting conversation tracking:', {
      ...data,
      type: 'memory-only'
    });
    setConversationData(data);
  }, []);

  const endTracking = useCallback((endTime: string) => {
    setConversationData(prev => {
      if (!prev) return null;
      console.log('Ending conversation tracking:', {
        ...prev,
        endTime,
        type: 'memory-only'
      });
      return { ...prev, endTime };
    });
  }, []);

  const createConversationRecord = useCallback(async (
    userId: string, 
    data: ConversationData
  ) => {
    if (!data.endTime) {
      console.error('Cannot create conversation record without end time');
      return null;
    }

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        console.log(`Creating conversation record in database (attempt ${attempt + 1}):`, {
          userId,
          ...data
        });

        const { data: record, error } = await supabase
          .from('user_conversations')
          .insert({
            clerk_id: userId,
            agent_id: data.agentId,
            elevenlabs_conversation_id: data.elevenLabsConversationId,
            status: CALL_STATUS.SUCCESS,
            start_time: data.startTime,
            end_time: data.endTime,
            metadata: {},
            analysis: {},
            data_collection_results: {}
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23503' && attempt < maxRetries - 1) {
            // Foreign key violation - wait a bit and retry
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            attempt++;
            continue;
          }
          console.error('Failed to create conversation record:', error);
          throw error;
        }

        console.log('Successfully created conversation record:', record);
        return record;

      } catch (error) {
        if (attempt === maxRetries - 1) {
          console.error('Error in createConversationRecord:', error);
          throw error;
        }
        attempt++;
      }
    }
    
    // Clear the conversation data from memory
    setConversationData(null);
    return null;
  }, [supabase]);

  return {
    startTracking,
    endTracking,
    createConversationRecord,
    conversationData,
    clearConversationData: () => setConversationData(null)
  };
}