"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';
import { useConversationTracking } from '@/hooks/useConversationTracking';
import { translations } from '@/translations';

// Get scenario titles from translations
const DEFAULT_SCENARIOS = {
  [translations.ru.agent.id]: translations.ru.agent.title,
  [translations.en.agent.id]: translations.en.agent.title
};

export function PostSignupHandler() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { createConversationRecord } = useConversationTracking();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const processConversation = async () => {
      // Skip if currently processing or not ready
      if (isProcessing || !isLoaded || !user) return;
      
      // Check if we have any parameters to process
      const hasUrlParams = searchParams.get('conversation') !== null;
      const hasLocalStorage = localStorage.getItem('willow_conversation_params') !== null;
      
      if (!hasUrlParams && !hasLocalStorage) {
        // No conversation to process, redirect to dashboard
        router.replace('/dashboard');
        return;
      }

      setIsProcessing(true);

      try {
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

        if (!elevenLabsConversationId || !agentId || !startTime || !endTime) {
          console.log('Missing required parameters');
          router.replace('/dashboard');
          return;
        }

        // Get scenario title from default scenarios or use untitled
        const scenarioTitle = DEFAULT_SCENARIOS[agentId] || 'Untitled Scenario';
        console.log('Using scenario title:', scenarioTitle, 'for agent:', agentId);

        console.log('Creating conversation record:', {
          elevenLabsConversationId,
          agentId,
          startTime,
          endTime,
          scenarioTitle
        });
        
        await createConversationRecord(user.id, {
          elevenLabsConversationId,
          agentId,
          startTime,
          endTime,
          scenarioInfo: {
            title: scenarioTitle
          }
        });

        // Clear the stored conversation params
        localStorage.removeItem('willow_conversation_params');
        localStorage.removeItem('willow_pending_conversations');

        // Use window.location to force a full page reload and clear all state
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Failed to create conversation record:', error);
        // Clear params and redirect on error too
        localStorage.removeItem('willow_conversation_params');
        localStorage.removeItem('willow_pending_conversations');
        window.location.href = '/dashboard';
      } finally {
        setIsProcessing(false);
      }
    };

    processConversation();
  }, [isLoaded, user, searchParams, createConversationRecord, router, isProcessing]);

  // Return null or a loading state if processing
  return isProcessing ? (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Processing conversation...</div>
    </div>
  ) : null;
} 