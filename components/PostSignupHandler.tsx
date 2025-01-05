"use client";

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';
import { useConversationTracking } from '@/hooks/useConversationTracking';

export function PostSignupHandler() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { createConversationRecord } = useConversationTracking();

  useEffect(() => {
    // Try to get params from URL first
    let elevenLabsConversationId = searchParams.get('conversation');
    let agentId = searchParams.get('agent');
    let startTime = searchParams.get('start_time');
    let endTime = searchParams.get('end_time');

    // If not in URL, try localStorage
    if (!elevenLabsConversationId) {
      try {
        const storedParams = localStorage.getItem('willow_conversation_params');
        if (storedParams) {
          const params = JSON.parse(storedParams);
          elevenLabsConversationId = params.conversation;
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
      elevenLabsConversationId,
      agentId,
      startTime,
      endTime
    });

    if (!elevenLabsConversationId || !agentId || !startTime || !endTime) {
      console.log('Missing required parameters:', {
        elevenLabsConversationId,
        agentId,
        startTime,
        endTime
      });
      return;
    }

    const createRecord = async () => {
      if (!isLoaded || !user) return;

      try {
        console.log('Creating conversation record:', {
          elevenLabsConversationId,
          agentId,
          startTime,
          endTime
        });
        
        await createConversationRecord(user.id, {
          elevenLabsConversationId,
          agentId,
          startTime,
          endTime
        });

        // Clear the stored conversation params
        localStorage.removeItem('willow_conversation_params');
        localStorage.removeItem('willow_pending_conversations');

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