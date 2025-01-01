"use client";

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';
import { useConversationTracking } from '@/hooks/useConversationTracking';

export function PostSigninHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { createConversationRecord } = useConversationTracking();

  useEffect(() => {
    const createRecord = async () => {
      if (!isLoaded || !user) return;

      // Try to get params from URL first
      let conversationId = searchParams.get('conversation');
      let agentId = searchParams.get('agent');
      let startTime = searchParams.get('start_time');
      let endTime = searchParams.get('end_time');

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
        
        await createConversationRecord(user.id, {
          elevenLabsConversationId: conversationId,
          agentId,
          startTime,
          endTime
        });

        // Clear localStorage after successful use
        localStorage.removeItem('willow_conversation_params');
        
        router.push('/dashboard');
      } catch (error) {
        console.error('Failed to create conversation record:', error);
        router.push('/dashboard');
      }
    };

    createRecord();
  }, [isLoaded, user, searchParams, createConversationRecord, router]);

  return null;
} 