"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';
import { useConversationTracking } from '@/hooks/useConversationTracking';

export function PostSigninHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { createConversationRecord } = useConversationTracking();
  const [isRouterReady, setIsRouterReady] = useState(false);

  // Ensure router is ready before using it
  useEffect(() => {
    setIsRouterReady(true);
  }, []);

  useEffect(() => {
    const createRecord = async () => {
      if (!isLoaded || !user || !isRouterReady) return;

      // Try to get params from URL first
      let conversationId = searchParams?.get('conversation');
      let agentId = searchParams?.get('agent');
      let startTime = searchParams?.get('start_time');
      let endTime = searchParams?.get('end_time');

      // If not in URL, try localStorage
      if (!conversationId) {
        try {
          const storedParams = localStorage.getItem('willow_conversation_params');
          if (storedParams) {
            const params = JSON.parse(storedParams);
            conversationId = params.conversation;
            agentId = params.agent;
            startTime = params.start_time;
            endTime = params.end_time;
            console.log('Retrieved params from localStorage:', params);
          }
        } catch (error) {
          console.error('Error reading from localStorage:', error);
        }
      }

      // Also try to get the active conversation ID as a last resort
      if (!conversationId) {
        conversationId = localStorage.getItem('willow_active_conversation');
        // If we have a conversationId but no other details, use defaults
        if (conversationId && (!agentId || !startTime || !endTime)) {
          agentId = agentId || 'doXNIsa8qmit1NjLQxgT'; // Default onboarding agent ID
          startTime = startTime || new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
          endTime = endTime || new Date().toISOString();
        }
      }

      console.log('Final parameters:', {
        conversationId,
        agentId,
        startTime,
        endTime
      });

      if (!conversationId || !agentId || !startTime || !endTime) {
        console.log('Missing required parameters:', {
          conversationId,
          agentId,
          startTime,
          endTime
        });
        router.push('/dashboard');
        return;
      }

      try {
        console.log('Creating conversation record after sign-in:', {
          userId: user.id,
          conversationId,
          agentId,
          startTime,
          endTime
        });
        
        // First, ensure the user record exists in Supabase
        console.log('Ensuring user record exists before creating conversation record');
        try {
          const ensureUserResponse = await fetch('/api/ensure-user-exists', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (!ensureUserResponse.ok) {
            console.error('Error ensuring user exists:', await ensureUserResponse.json());
          } else {
            const userData = await ensureUserResponse.json();
            console.log('User record check result:', userData.message);
          }
        } catch (userErr) {
          console.error('Exception ensuring user exists:', userErr);
          // Continue anyway - the createConversationRecord has its own check
        }
        
        await createConversationRecord({
          elevenLabsConversationId: conversationId,
          agentId,
          startTime,
          endTime,
          scenarioTitle: 'Introductory Assessment'
        });

        // NOTE: We don't need to explicitly call the process-conversation API here.
        // The database triggers (update_user_traits_trigger, trigger_conversation_traits, etc.)
        // will automatically extract traits and call the traits_skills function when:
        //   1. The analysis field is updated on the conversation
        //   2. The data_collection_results field is updated
        console.log('Conversation record created. Database triggers will handle trait extraction and skill calculations.');

        // Clear localStorage after successful use
        localStorage.removeItem('willow_conversation_params');
        localStorage.removeItem('conversationParams');
        localStorage.removeItem('willow_active_conversation');
        localStorage.removeItem('willow_pending_conversations');
        
        router.push('/dashboard');
      } catch (error) {
        console.error('Failed to create conversation record:', error);
        router.push('/dashboard');
      }
    };

    createRecord();
  }, [isLoaded, user, searchParams, createConversationRecord, router, isRouterReady]);

  return null;
} 