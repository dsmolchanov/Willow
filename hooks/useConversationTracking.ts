import { useCallback, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabase } from '@/context/SupabaseContext';
import type { Message } from '@/types';

// Define the enum to match the database
type CallStatus = 'success' | 'failure' | 'unknown' | 'processed';

interface PendingConversation {
  elevenLabsConversationId: string;
  agentId: string;
  startTime: string;
  scenarioInfo: {
    scenario_id: number;
    title: string;
    skill_ids: number[];
  };
  transcript?: Message[];
  analysis?: any;
  endTime?: string;
  success?: boolean;
}

export function useConversationTracking() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [pendingConversation, setPendingConversation] = useState<PendingConversation | null>(null);

  const startTracking = useCallback(async (data: {
    elevenLabsConversationId: string;
    agentId: string;
    startTime: string;
    scenarioInfo: {
      scenario_id: number;
      title: string;
      skill_ids: number[];
    };
  }) => {
    if (!user?.id) {
      console.log('Storing conversation data locally for guest user');
      setPendingConversation(data);
      return;
    }

    try {
      console.log('Starting conversation tracking with status: unknown');
      const { data: result, error } = await supabase
        .from('user_conversations')
        .insert({
          clerk_id: user.id,
          agent_id: data.agentId,
          elevenlabs_conversation_id: data.elevenLabsConversationId,
          start_time: data.startTime,
          scenario_info: data.scenarioInfo,
          status: 'unknown'
        })
        .select();

      if (error) {
        console.error('Database error during start tracking:', error);
        throw error;
      }

      console.log('Successfully started tracking:', result);
      return result[0];
    } catch (error) {
      console.error('Failed to start conversation tracking:', error);
      throw error;
    }
  }, [supabase, user]);

  const endTracking = useCallback(async (data: {
    elevenLabsConversationId: string;
    endTime: string;
    transcript?: Message[];
    analysis?: any;
    success?: boolean;
  }) => {
    if (!user?.id) {
      console.log('Updating pending conversation data for guest user');
      setPendingConversation(prev => prev ? {
        ...prev,
        ...data
      } : null);
      return;
    }

    try {
      const status: CallStatus = data.success ? 'success' : 'failure';
      console.log('Ending conversation with status:', status);
      
      const { error } = await supabase
        .from('user_conversations')
        .update({
          end_time: data.endTime,
          transcript: data.transcript || [],
          analysis: data.analysis || {},
          status
        })
        .eq('elevenlabs_conversation_id', data.elevenLabsConversationId);

      if (error) {
        console.error('Database error during end tracking:', error);
        throw error;
      }

      console.log('Successfully ended tracking for:', data.elevenLabsConversationId);
    } catch (error) {
      console.error('Failed to end conversation tracking:', error);
      throw error;
    }
  }, [supabase, user]);

  const syncPendingConversation = useCallback(async () => {
    if (!user?.id || !pendingConversation) return;

    try {
      console.log('Syncing pending conversation to database');
      await startTracking(pendingConversation);
      
      if (pendingConversation.endTime) {
        await endTracking({
          elevenLabsConversationId: pendingConversation.elevenLabsConversationId,
          endTime: pendingConversation.endTime,
          transcript: pendingConversation.transcript,
          analysis: pendingConversation.analysis,
          success: pendingConversation.success
        });
      }

      setPendingConversation(null);
    } catch (error) {
      console.error('Failed to sync pending conversation:', error);
    }
  }, [user, pendingConversation, startTracking, endTracking]);

  const createConversationRecord = useCallback(async (clerkId: string, data: {
    elevenLabsConversationId: string;
    agentId: string;
    startTime: string;
    endTime: string;
    transcript?: Message[];
    analysis?: any;
    scenarioInfo?: {
      title: string;
    };
  }) => {
    try {
      console.log('Creating conversation record in Supabase');
      const { error } = await supabase
        .from('user_conversations')
        .insert({
          clerk_id: clerkId,
          agent_id: data.agentId,
          elevenlabs_conversation_id: data.elevenLabsConversationId,
          start_time: data.startTime,
          end_time: data.endTime,
          transcript: data.transcript || [],
          analysis: data.analysis || {},
          scenario_info: data.scenarioInfo || { title: 'Unknown Scenario' },
          status: 'success'
        });

      if (error) {
        console.error('Database error during conversation record creation:', error);
        throw error;
      }

      console.log('Successfully created conversation record');
    } catch (error) {
      console.error('Failed to create conversation record:', error);
      throw error;
    }
  }, [supabase]);

  return {
    startTracking,
    endTracking,
    pendingConversation,
    syncPendingConversation,
    createConversationRecord
  };
}