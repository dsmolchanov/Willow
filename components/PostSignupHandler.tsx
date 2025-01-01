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

  // Debug logs
  console.log('All search params:', Object.fromEntries(searchParams.entries()));
  
  // Check the actual parameter names
  console.log('Parameters received:', {
    conversation: searchParams.get('conversation'),
    agent: searchParams.get('agent'),
    start_time: searchParams.get('start_time'),
    end_time: searchParams.get('end_time')
  });

  useEffect(() => {
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
      return;
    }

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