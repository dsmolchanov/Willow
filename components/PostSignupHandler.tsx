"use client";

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';
import { useConversationTracking } from '@/hooks/useConversationTracking';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second

export function PostSignupHandler() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { createConversationRecord } = useConversationTracking();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const waitForUser = async (clerkId: string, retryCount = 0): Promise<boolean> => {
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkId)
        .single();

      if (error || !existingUser) {
        if (retryCount >= MAX_RETRIES) {
          console.error('Max retries reached waiting for user record');
          return false;
        }
        
        console.log(`User record not found, retrying in ${RETRY_DELAY}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return waitForUser(clerkId, retryCount + 1);
      }

      return true;
    };

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
        // Wait for user record to be created by webhook
        const userExists = await waitForUser(user.id);
        
        if (!userExists) {
          console.error('Failed to find user record after maximum retries');
          router.push('/dashboard');
          return;
        }

        console.log('Creating conversation record after sign-up:', {
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
  }, [isLoaded, user, searchParams, createConversationRecord, router, supabase]);

  return null;
} 