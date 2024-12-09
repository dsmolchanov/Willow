"use client";

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';
import { useConversationTracking } from '@/hooks/useConversationTracking';

export function PostSigninHandler() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { createConversationRecord } = useConversationTracking();

  useEffect(() => {
    const createRecord = async () => {
      if (!isLoaded || !user) return;

      const conversationId = searchParams.get('conversation');
      const agentId = searchParams.get('agent');
      const startTime = searchParams.get('start_time');
      const endTime = searchParams.get('end_time');

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