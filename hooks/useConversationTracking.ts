import { useCallback, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabase } from '@/context/SupabaseContext';
import type { Message } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

// Define the enum to match the database
type CallStatus = 'success' | 'failure' | 'unknown' | 'processed';

interface PendingConversation {
  elevenLabsConversationId: string;
  agentId: string;
  startTime: string;
  scenarioInfo: {
    scenario_id: number;
    skill_ids: number[];
    type: 'lesson' | 'onboarding';
    title?: string;
  };
  transcript?: Message[];
  analysis?: any;
  endTime?: string;
  success?: boolean;
}

interface ConversationTrackingResult {
  elevenLabsConversationId: string;
  endTime: string;
  success: boolean;
}

export function useConversationTracking() {
  const [pendingConversation, setPendingConversation] = useState<PendingConversation | null>(null);
  const supabase = useSupabase();
  const { user } = useUser();

  const startTracking = useCallback(async (data: {
    elevenLabsConversationId: string;
    agentId: string;
    startTime: string;
    scenarioInfo: {
      scenario_id: number;
      skill_ids: number[];
      type: 'lesson' | 'onboarding';
    };
  }) => {
    console.log('Starting conversation tracking');
    setPendingConversation(data);

    try {
      // Create or update user_scenarios entry
      const { error } = await supabase
        .from('user_scenarios')
        .upsert({
          clerk_id: user?.id,
          scenario_id: data.scenarioInfo.scenario_id,
          start_time: data.startTime,
          status: 'In Progress',
          skill_objectives: {
            skill_ids: data.scenarioInfo.skill_ids,
            conversation_id: data.elevenLabsConversationId,
            type: data.scenarioInfo.type
          }
        }, {
          onConflict: 'clerk_id,scenario_id',
          ignoreDuplicates: false
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error starting scenario tracking:', error);
    }
  }, [supabase, user]);

  const endTracking = useCallback(async ({ 
    elevenLabsConversationId,
    endTime,
    success 
  }: ConversationTrackingResult) => {
    console.log('Ending conversation with status:', success ? 'success' : 'failed');

    if (!pendingConversation?.startTime || !pendingConversation?.scenarioInfo.scenario_id || !user?.id) {
      console.error('Missing required conversation data');
      return;
    }

    try {
      // Use upsert to ensure all fields are present
      const { error } = await supabase
        .from('user_scenarios')
        .upsert({
          clerk_id: user.id,
          scenario_id: pendingConversation.scenarioInfo.scenario_id,
          start_time: pendingConversation.startTime,
          end_time: endTime,
          status: 'Completed',
          skill_objectives: {
            skill_ids: pendingConversation.scenarioInfo.skill_ids,
            conversation_id: elevenLabsConversationId,
            type: pendingConversation.scenarioInfo.type
          },
          practice_metrics: {
            success_rate: success ? 100 : 0,
            key_achievements: [],
            challenge_areas: []
          },
          duration_minutes: Math.round(
            (new Date(endTime).getTime() - new Date(pendingConversation.startTime).getTime()) 
            / (1000 * 60)
          )
        }, {
          onConflict: 'clerk_id,scenario_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Database error during end tracking:', error);
        throw error;
      }

    } catch (error) {
      console.error('Failed to end conversation tracking:', error);
      throw error;
    }
  }, [supabase, user, pendingConversation]);

  const syncPendingConversation = useCallback(async () => {
    if (!user?.id || !pendingConversation) return;

    try {
      console.log('Syncing pending conversation to database');
      await startTracking(pendingConversation);
      
      if (pendingConversation.endTime) {
        await endTracking({
          elevenLabsConversationId: pendingConversation.elevenLabsConversationId,
          endTime: pendingConversation.endTime,
          success: pendingConversation.success ?? false
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