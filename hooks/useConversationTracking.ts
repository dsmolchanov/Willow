"use client";

import { useCallback, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@clerk/nextjs';

type CallStatus = 'processing' | 'done';

export function useConversationTracking() {
  const [conversationDbId, setConversationDbId] = useState<number | null>(null);
  const supabase = createClientComponentClient();
  const { userId, isLoaded, isSignedIn } = useAuth();

  console.log('Auth state:', { userId, isLoaded, isSignedIn });

  const startConversation = useCallback(async (agentId: string) => {
    console.log('Starting conversation tracking:', { agentId, userId });

    if (!isSignedIn || !userId) {
      console.log('User not signed in, skipping database operation');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_conversations')
        .insert({
          clerk_id: userId,
          agent_id: agentId,
          elevenlabs_conversation_id: `${agentId}_${Date.now()}`,
          status: 'processing' as CallStatus,
          start_time: new Date().toISOString(),
          metadata: {},
          analysis: {},
          data_collection_results: {}
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to insert conversation record:', error);
        throw error;
      }

      console.log('Successfully created conversation record:', data);
      setConversationDbId(data.conversation_id);

    } catch (error) {
      console.error('Error in startConversation:', error);
      console.error('Error details:', {
        userId,
        agentId,
        timestamp: new Date().toISOString()
      });
    }
  }, [supabase, userId, isSignedIn]);

  const endConversation = useCallback(async () => {
    console.log('Ending conversation:', { conversationDbId });

    if (!conversationDbId) {
      console.log('No active conversation to end');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_conversations')
        .update({
          status: 'done' as CallStatus,
          end_time: new Date().toISOString()
        })
        .eq('conversation_id', conversationDbId);

      if (error) {
        console.error('Failed to update conversation record:', error);
        throw error;
      }

      console.log('Successfully ended conversation:', conversationDbId);
      setConversationDbId(null);

    } catch (error) {
      console.error('Error in endConversation:', error);
      console.error('Error details:', {
        conversationDbId,
        timestamp: new Date().toISOString()
      });
    }
  }, [conversationDbId, supabase]);

  return {
    startConversation,
    endConversation,
    conversationDbId,
    isActive: !!conversationDbId
  };
}