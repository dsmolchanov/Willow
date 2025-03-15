import { useCallback, useState } from 'react';
import { useClerkSupabaseClient } from './useClerkSupabaseClient';
import { useUser } from '@clerk/nextjs';
import type { Message } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { ConversationStorage, ConversationParams } from '@/lib/conversationStorage';

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

interface ConversationData {
  elevenLabsConversationId: string;
  agentId: string;
  startTime: string;
  endTime: string;
  scenarioTitle: string;
  scenarioInfo?: any;
}

export function useConversationTracking() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useClerkSupabaseClient();
  const { user, isLoaded } = useUser();

  const startConversation = useCallback(async (agentId: string) => {
    if (!isLoaded || !user) {
      console.log('User not loaded, storing conversation params for later');
      // Create a placeholder for the conversation that will be used after login
      const startTime = new Date().toISOString();
      
      // Use the storage service
      ConversationStorage.saveConversationParams({
        conversation: '',  // Will be filled in later
        agent: agentId,
        start_time: startTime,
        end_time: '',  // Will be filled in later
        scenario_info: {}
      });
      
      return { 
        conversationId: null,
        startTime 
      };
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Starting conversation tracking');
      const startTime = new Date().toISOString();
      
      // We'll create the actual database record when the conversation ends
      return {
        conversationId: null,
        startTime
      };
    } catch (err) {
      console.error('Error starting conversation tracking:', err);
      setError('Failed to start conversation tracking');
      return { conversationId: null, startTime: new Date().toISOString() };
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, user]);

  const endConversation = useCallback(async (params: {
    conversationId: string;
    agentId: string;
    startTime: string;
    status: 'success' | 'aborted';
    scenarioInfo?: any;
  }) => {
    const { conversationId: elevenLabsConversationId, agentId, startTime, status, scenarioInfo } = params;
    const endTime = new Date().toISOString();
    
    if (!isLoaded || !user) {
      console.log('User not loaded, storing conversation for processing after login');
      
      // Use the new storage service to save the conversation parameters
      const conversationParams: ConversationParams = {
        conversation: elevenLabsConversationId,
        agent: agentId,
        start_time: startTime,
        end_time: endTime,
        scenario_info: scenarioInfo || {}
      };
      
      console.log('Storing conversation data for post-login processing:', conversationParams);
      
      // Use the storage service to save the parameters
      // This safely handles all the storage operations and prevents race conditions
      ConversationStorage.saveConversationParams(conversationParams);
      
      return null;
    }

    try {
      // User is logged in, create the conversation record immediately
      return await createConversationRecord({
        elevenLabsConversationId,
        agentId,
        startTime,
        endTime,
        scenarioTitle: scenarioInfo?.title || 'Conversation',
        scenarioInfo
      });
    } catch (err) {
      console.error('Error ending conversation:', err);
      setError('Failed to end conversation');
      return null;
    }
  }, [isLoaded, user]);

  const createConversationRecord = async (conversationData: ConversationData) => {
    if (!user) {
      console.error('Missing required conversation data');
      return null;
    }

    try {
      setIsLoading(true);
      console.log('Creating conversation record in Supabase');
      
      // Validate timestamps and fix if needed
      const { elevenLabsConversationId, agentId, startTime, endTime, scenarioTitle, scenarioInfo } = conversationData;
      
      // Add debug logging
      console.log('Processing conversation data:', { elevenLabsConversationId, agentId, startTime, endTime });
      
      // Parse timestamps and ensure they're valid
      const parsedStartTime = new Date(startTime);
      const parsedEndTime = new Date(endTime);
      
      // Ensure the timestamps are valid
      if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
        console.error('Invalid timestamp format:', { startTime, endTime });
        return null;
      }
      
      // Ensure end time is after start time
      let validEndTime = endTime;
      if (parsedEndTime <= parsedStartTime) {
        console.warn('End time is before or equal to start time, adjusting...', { startTime, endTime });
        // Add 1 second to start time to ensure proper ordering
        const fixedEndTime = new Date(parsedStartTime.getTime() + 1000);
        validEndTime = fixedEndTime.toISOString();
        console.log('Adjusted end time:', validEndTime);
      }
      
      // Check if this conversation already exists to prevent duplicates
      try {
        console.log(`Checking if conversation with ID ${elevenLabsConversationId} already exists...`);
        const { data: existingConv, error: checkError } = await supabase
          .from('user_conversations')
          .select('conversation_id')
          .eq('elevenlabs_conversation_id', elevenLabsConversationId)
          .eq('clerk_id', user.id)
          .maybeSingle();
          
        if (checkError) {
          console.warn('Error checking for existing conversation:', checkError);
        } else if (existingConv) {
          console.log('Conversation already exists, returning existing ID:', existingConv.conversation_id);
          setConversationId(existingConv.conversation_id);
          return existingConv.conversation_id;
        }
      } catch (checkErr) {
        console.error('Error checking for existing conversation:', checkErr);
      }
      
      // First, ensure the user record exists using the API endpoint instead of direct database access
      try {
        console.log(`Ensuring user ${user.id} exists via API endpoint...`);
        const response = await fetch('/api/ensure-user-exists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error from ensure-user-exists API:', errorData);
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const userData = await response.json();
        console.log('User existence check result:', userData.message);
      } catch (userError) {
        console.error('Failed to ensure user exists:', userError);
        // Continue anyway - we'll handle errors in the conversation insert
      }
      
      // Now create the conversation record
      try {
        console.log('Inserting conversation record with data:', {
          clerk_id: user.id,
          elevenlabs_conversation_id: elevenLabsConversationId,
          agent_id: agentId,
          start_time: startTime,
          end_time: validEndTime
        });
        
        const { data, error } = await supabase
          .from('user_conversations')
          .insert({
            clerk_id: user.id,
            elevenlabs_conversation_id: elevenLabsConversationId,
            agent_id: agentId,
            start_time: startTime,
            end_time: validEndTime,  // Use the validated end time
            scenario_info: {
              ...scenarioInfo,
              title: scenarioTitle
            }
          })
          .select('conversation_id')
          .single();

        if (error) {
          console.error('Error creating conversation record:', error);
          throw error;
        }

        // Add extra debugging to understand what's in the data object
        console.log('Successfully created conversation record, full response:', data);
        console.log('Conversation ID from response:', data?.conversation_id);
        
        // Fix: Set the conversation ID in state and return it
        if (data && data.conversation_id) {
          console.log(`Setting conversation ID in state: ${data.conversation_id}`);
          setConversationId(data.conversation_id);
        
          // Check if user has traits, if not or if this is a new onboarding conversation,
          // ensure the traits_skills function runs (as a backup to the database triggers)
          if (scenarioInfo?.type === 'onboarding' || 
              scenarioTitle?.toLowerCase().includes('onboarding') || 
              scenarioTitle?.toLowerCase().includes('introductory')) {
            // First check if user already has traits
            const { data: traits, error: traitsError } = await supabase
              .from('user_traits')
              .select('user_trait_id')
              .eq('clerk_id', user.id)
              .single();
            
            // If no traits or an error (404), directly invoke traits_skills as a backup
            if (traitsError || !traits) {
              console.log('No existing traits found or this is an onboarding conversation - directly invoking traits_skills as backup');
              
              try {
                // If there are dummy trait evaluations in scenarioInfo, use those
                const dummyTraitEvaluations = scenarioInfo?.default_traits || {
                  "life_context": {
                    "value": "professional_growth",
                    "rationale": "User is focused on professional development"
                  },
                  "stakes_level": {
                    "value": "medium",
                    "rationale": "The stakes are moderate for the user"
                  },
                  "growth_motivation": {
                    "value": "purpose_driven",
                    "rationale": "User shows signs of purpose-driven motivation"
                  },
                  "confidence_pattern": {
                    "value": "growth_mindset",
                    "rationale": "User demonstrates a growth mindset"
                  },
                  "interaction_style": {
                    "value": "collaborative",
                    "rationale": "User shows a preference for collaborative interactions"
                  }
                };
                
                // Call traits_skills directly
                const { error: fnError } = await supabase.functions.invoke('traits_skills', {
                  body: { 
                    action: 'initial_calculation',
                    clerk_id: user.id,
                    data_collection_results: dummyTraitEvaluations
                  }
                });
                
                if (fnError) {
                  console.error('Error invoking traits_skills directly:', fnError);
                } else {
                  console.log('Successfully invoked traits_skills directly as backup');
                }
              } catch (fnErr) {
                console.error('Exception invoking traits_skills directly:', fnErr);
                // Don't fail the overall process for this
              }
            }
          }
          
          // Important: Make sure to explicitly return the conversation ID
          console.log(`Returning conversation ID: ${data.conversation_id}`);
          return data.conversation_id;
        } else {
          console.error('No conversation_id returned from insert operation');
          
          // Try to get the conversation ID by querying for the record we just created
          try {
            console.log('Attempting to retrieve the conversation record we just created');
            const { data: createdConv } = await supabase
              .from('user_conversations')
              .select('conversation_id')
              .eq('elevenlabs_conversation_id', elevenLabsConversationId)
              .eq('clerk_id', user.id)
              .maybeSingle();
              
            if (createdConv?.conversation_id) {
              console.log('Retrieved conversation ID from query:', createdConv.conversation_id);
              setConversationId(createdConv.conversation_id);
              return createdConv.conversation_id;
            }
          } catch (queryErr) {
            console.error('Error querying for created conversation:', queryErr);
          }
          
          return null;
        }
      } catch (convError) {
        console.error('Error creating conversation record:', convError);
        
        // If it's a unique constraint violation, the record already exists
        if (typeof convError === 'object' && convError !== null && 'code' in convError && convError.code === '23505') {
          console.log('Conversation already exists (unique constraint violation)');
          
          // Try to fetch the existing conversation
          try {
            const { data: existingConv } = await supabase
              .from('user_conversations')
              .select('conversation_id')
              .eq('elevenlabs_conversation_id', elevenLabsConversationId)
              .eq('clerk_id', user.id)
              .single();
              
            if (existingConv?.conversation_id) {
              console.log('Retrieved existing conversation:', existingConv);
              setConversationId(existingConv.conversation_id);
              return existingConv.conversation_id;
            }
          } catch (fetchErr) {
            console.error('Error fetching existing conversation:', fetchErr);
          }
        }
        
        return null;
      }
    } catch (error) {
      console.error('Error creating conversation record:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    conversationId,
    isLoading,
    error,
    startConversation,
    endConversation,
    createConversationRecord
  };
}