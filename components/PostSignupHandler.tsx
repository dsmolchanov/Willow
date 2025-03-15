"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useConversationTracking } from '@/hooks/useConversationTracking';
import { ConversationStorage } from '@/lib/conversationStorage';

// Legacy cleanup helper (now uses the storage service)
const cleanupLocalStorage = (afterSuccessfulProcessing = false) => {
  if (afterSuccessfulProcessing) {
    ConversationStorage.completeProcessing();
  } else {
    ConversationStorage.selectiveCleanup();
  }
};

export function PostSignupHandler() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { createConversationRecord } = useConversationTracking();
  const [isRouterReady, setIsRouterReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingComplete, setProcessingComplete] = useState(false);

  // Ensure router is ready before using it
  useEffect(() => {
    setIsRouterReady(true);
  }, []);

  // Clear redirect flags when component mounts
  useEffect(() => {
    // First reset any stale flags
    ConversationStorage.resetStaleFlags();
    
    // If we're in the post-signup handler, the redirect has completed
    // so we can clear the flags unless we need to handle a conversation
    const params = ConversationStorage.getConversationParams();
    if (!params || !params.conversation) {
      // If there's no conversation to process, safely clear all flags
      ConversationStorage.clearRedirectFlags();
      console.log('PostSignupHandler: Cleared redirect flags (no conversation to process)');
    } else {
      console.log('PostSignupHandler: Found conversation to process, keeping flags until processing completes');
    }
  }, []);

  // When user signs out, clean up localStorage
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      ConversationStorage.clearAll();
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    // Only proceed if everything is loaded and router is ready
    // Also prevent processing if we've already completed it
    if (!isLoaded || !isSignedIn || !isRouterReady || isProcessing || processingComplete) return;

    async function handlePostSignup() {
      try {
        setIsProcessing(true);
        setError(null);
        
        // Get conversation parameters using the storage service
        const params = ConversationStorage.getConversationParams();
        
        if (!params) {
          console.log('No conversation params found, redirecting to dashboard');
          setProcessingComplete(true);
          router.push('/dashboard');
          return;
        }

        console.log('Retrieved params from storage:', params);

        // Extract conversation data
        const {
          conversation: elevenLabsConversationId,
          agent: agentId,
          start_time: startTime,
          end_time: endTime,
          scenario_info: scenarioInfo
        } = params;

        if (!elevenLabsConversationId) {
          console.log('No conversation ID found, redirecting to dashboard');
          setError('Missing conversation ID');
          setProcessingComplete(true);
          ConversationStorage.clearAll();
          router.push('/dashboard');
          return;
        }

        // Default agent ID for onboarding conversations if not provided
        // This prevents the not-null constraint error
        const effectiveAgentId = agentId || 'doXNIsa8qmit1NjLQxgT'; // Default onboarding agent ID

        // Get scenario title (if available)
        const scenarioTitle = scenarioInfo?.title || 'Introductory Assessment';
        console.log(`Using scenario title: ${scenarioTitle} for agent: ${effectiveAgentId}`);

        // Create conversation record in Supabase
        console.log('Creating conversation record:', {
          elevenLabsConversationId,
          agentId: effectiveAgentId,
          startTime,
          endTime,
          scenarioTitle
        });

        const conversationId = await createConversationRecord({
          elevenLabsConversationId,
          agentId: effectiveAgentId,
          startTime,
          endTime,
          scenarioTitle,
          scenarioInfo
        });

        // Mark processing as complete to prevent duplicate attempts
        setProcessingComplete(true);
        
        // Now it's safe to clean up all storage (after successful processing)
        ConversationStorage.completeProcessing();
        
        if (conversationId) {
          console.log(`Conversation record created successfully (ID: ${conversationId})`);
          router.push('/dashboard');
        } else {
          // If we don't have a conversationId but no error was thrown,
          // it's possible the conversation was created but the ID wasn't returned properly
          console.warn('No conversation ID returned, redirecting to dashboard anyway');
          
          // Show error message briefly before redirecting
          setError('No conversation ID returned, but database operation may have succeeded');
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
      } catch (error) {
        console.error('Error in post-signup handling:', error);
        
        // Selective cleanup on error - don't remove conversation params in case retry is needed
        ConversationStorage.selectiveCleanup();
        
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setProcessingComplete(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } finally {
        setIsProcessing(false);
      }
    }

    handlePostSignup();
  }, [isLoaded, isSignedIn, router, createConversationRecord, isRouterReady, isProcessing, processingComplete]);

  // Component can display an error message if needed
  return error ? (
    <div className="p-4 bg-red-50 text-red-700 rounded-md max-w-md mx-auto mt-8">
      <h3 className="font-bold">Error During Processing</h3>
      <p>{error}</p>
      <p className="text-sm mt-2">Redirecting to dashboard...</p>
    </div>
  ) : null;
} 