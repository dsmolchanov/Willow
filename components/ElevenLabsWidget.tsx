"use client";

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useConversation } from '@11labs/react';
import { useConversationTracking } from '@/hooks/useConversationTracking';
import { Button } from '@/components/ui/button';
import { PhoneCall, PhoneOff } from 'lucide-react';
import { WaveAnimation } from './ui/wave-animation';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useUser } from "@clerk/nextjs";
import { ConversationStorage } from '@/lib/conversationStorage';

// Legacy cleanup function (kept for backward compatibility)
const cleanupAllConversationStorage = (preserveRedirectData = false) => {
  if (preserveRedirectData) {
    // Use the new storage service for selective cleanup
    ConversationStorage.selectiveCleanup();
  } else {
    // Use the new storage service for complete cleanup
    ConversationStorage.clearAll();
  }
};

interface ElevenLabsConversation {
  startSession: (options: any) => Promise<string>;
  endSession: () => Promise<void>;
  status: string;
  isSpeaking: boolean;
  elevenLabsConversationId?: string;
  isLoading?: boolean;
}

interface ElevenLabsWidgetProps {
  agentId: string;
  translationPath?: 'widget' | 'buddha.widget';
  scenarioInfo: {
    scenario_id: number;
    title: string;
    skill_ids: number[];
    type: 'lesson' | 'onboarding';  
  };
}

export function ElevenLabsWidget({ 
  agentId, 
  translationPath = 'widget',
  scenarioInfo
}: ElevenLabsWidgetProps) {
  const router = useRouter();
  const { isSignedIn, user, isLoaded } = useUser();
  const { language, t } = useLanguage();
  const { endConversation, startConversation } = useConversationTracking();
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [isHandlingStop, setIsHandlingStop] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const isRedirecting = useRef(false);
  const [pendingConversation, setPendingConversation] = useState<any>(null);
  
  // Track if redirection has been initiated to prevent race conditions
  const hasInitiatedRedirect = useRef(false);
  
  // Reset stale redirect flags when component mounts
  useEffect(() => {
    // This helps prevent issues with stuck redirect flags
    ConversationStorage.resetStaleFlags();
    
    // If this is a fresh mount and we don't have an active conversation,
    // also force reset any redirect flags to ensure buttons work properly
    if (!activeConversationId) {
      ConversationStorage.forceResetRedirectFlags();
    }
    
    console.log('ElevenLabsWidget: Initial redirect status -', 
      ConversationStorage.isRedirectInProgress() ? 'in progress' : 'not in progress');
  }, []);
  
  // Store active conversation in localStorage to prevent it being lost during remounts
  useEffect(() => {
    // When conversation ID changes, update storage
    if (activeConversationId) {
      localStorage.setItem('willow_active_conversation', activeConversationId);
    }
    
    // Recover conversation ID from storage if needed
    if (!activeConversationId && !pendingConversation) {
      const storedId = ConversationStorage.getActiveConversationId();
      if (storedId) {
        setActiveConversationId(storedId);
        // Also set basic pending conversation data to enable redirect
        setPendingConversation({
          elevenLabsConversationId: storedId,
          agentId,
          startTime: new Date().toISOString(),
          scenarioInfo
        });
      }
    }
  }, [activeConversationId, pendingConversation, agentId, scenarioInfo]);

  // Clear stored conversation data when component mounts
  useEffect(() => {
    // If we're at the dashboard and there's no active conversation,
    // clean up any stale conversation data
    const pathname = window.location.pathname;
    if (pathname === '/dashboard' || pathname === '/') {
      if (!activeConversationId) {
        ConversationStorage.clearAll();
      }
    }
  }, [activeConversationId]);

  // Listen for auth state changes - clear localStorage on logout
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      ConversationStorage.clearAll();
    }
  }, [isLoaded, isSignedIn]);

  const storeConversationAndRedirect = useCallback(async (endTime: string) => {
    // Check for both refs to prevent duplicate redirects
    if (isRedirecting.current || hasInitiatedRedirect.current) {
      console.log('Redirection already in progress, skipping');
      return;
    }

    // Set both flags immediately
    isRedirecting.current = true;
    hasInitiatedRedirect.current = true;
    
    // Inform the storage service that a redirect is starting
    ConversationStorage.beginRedirect();
    
    const conversationData = pendingConversation || {
      elevenLabsConversationId: ConversationStorage.getActiveConversationId(),
      agentId,
      startTime: new Date().toISOString(),
      scenarioInfo
    };

    if (conversationData.elevenLabsConversationId) {
      try {
        console.log('Storing and redirecting conversation:', conversationData.elevenLabsConversationId);
        
        // Store the current conversation data using the storage service
        const conversationParams = {
          conversation: conversationData.elevenLabsConversationId,
          agent: conversationData.agentId,
          start_time: conversationData.startTime,
          end_time: endTime,
          scenario_info: conversationData.scenarioInfo
        };
        
        console.log('Saving conversation params to storage:', conversationParams);
        
        // Use the storage service to save the conversation parameters
        ConversationStorage.saveConversationParams(conversationParams);
        
        // Create URL parameters for sign-in redirect
        const searchParams = new URLSearchParams({
          conversation: conversationData.elevenLabsConversationId,
          agent: conversationData.agentId,
          start_time: conversationData.startTime,
          end_time: endTime,
          return_to: '/dashboard'
        });
        
        console.log('REDIRECTING NOW to sign-in with conversation:', conversationData.elevenLabsConversationId);
        
        // Use a longer timeout to ensure storage operations complete
        setTimeout(() => {
          // Force a hard redirect to ensure it works even if React router is having issues
          window.location.href = `/sign-in?${searchParams.toString()}`;
        }, 50);
        
        return true;
      } catch (error) {
        console.error('Failed to store conversation:', error);
        
        // Clean up on error (but only non-essential data)
        ConversationStorage.selectiveCleanup();
        
        // Still redirect despite the error
        setTimeout(() => {
          window.location.href = '/sign-in';
        }, 50);
        
        return false;
      }
    } else {
      // No conversation data but still need to redirect
      console.log('No conversation data, redirecting to sign-in');
      
      // Safe cleanup since no conversation data exists
      ConversationStorage.clearAll();
      
      setTimeout(() => {
        window.location.href = '/sign-in';
      }, 50);
      
      return false;
    }
  }, [pendingConversation, agentId, scenarioInfo]);

  // Consolidated onDisconnect handler that handles all conversation ending scenarios
  const handleConversationEnd = useCallback(async (endTime: string = new Date().toISOString()) => {
    // If we have an active conversation but redirect flags are set, they might be stale
    if (activeConversationId && 
        (isRedirecting.current || hasInitiatedRedirect.current || ConversationStorage.isRedirectInProgress())) {
      console.log('Found active conversation with redirect flags - resetting flags');
      isRedirecting.current = false;
      hasInitiatedRedirect.current = false;
      ConversationStorage.forceResetRedirectFlags();
    }
    
    // Skip if redirect already started after our check
    if (isRedirecting.current || hasInitiatedRedirect.current || ConversationStorage.isRedirectInProgress()) {
      console.log('Redirection already in progress, skipping conversation end handler');
      return;
    }

    try {
      // Try to use active conversation ID, stored ID, or pending conversation ID
      const storedId = ConversationStorage.getActiveConversationId();
      const conversationId = activeConversationId || storedId || pendingConversation?.elevenLabsConversationId;
      
      if (!conversationId) {
        console.log('No conversation ID found to handle disconnect');
        return;
      }

      console.log('Handling conversation end for:', conversationId);
      
      // Don't try to end conversation again if already in progress
      if (!isRedirecting.current && !hasInitiatedRedirect.current) {
        // Record the conversation end in the database if possible
        try {
          await endConversation({
            conversationId,
            agentId,
            startTime: pendingConversation?.startTime || new Date().toISOString(),
            status: 'success',
            scenarioInfo
          });
        } catch (e) {
          console.error('Error ending conversation in database:', e);
          // Continue with redirect even if database update fails
        }
        
        // Handle redirection based on user state
        if (!isSignedIn) {
          console.log('Unsigned user, storing conversation and redirecting');
          // We use the helper function that properly stores data before redirecting
          await storeConversationAndRedirect(endTime);
        } else {
          console.log('Signed in user, redirecting to dashboard');
          // Ensure we don't try to redirect again
          isRedirecting.current = true;
          hasInitiatedRedirect.current = true;
          
          // Also inform the storage service
          ConversationStorage.beginRedirect();
          
          // Use timeout to ensure cleanup can finish
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 50);
        }
      }
    } catch (error) {
      console.error('Error in conversation end handler:', error);
      
      // Still try to redirect if not already redirecting
      if (!isSignedIn && !isRedirecting.current && !hasInitiatedRedirect.current) {
        isRedirecting.current = true;
        hasInitiatedRedirect.current = true;
        
        // Also inform the storage service
        ConversationStorage.beginRedirect();
        
        setTimeout(() => {
          window.location.href = '/sign-in';
        }, 50);
      }
    } finally {
      // Clear active conversation ID from state
      setActiveConversationId(undefined);
      // Don't clear from storage since we might need it for redirect
    }
  }, [activeConversationId, pendingConversation, isSignedIn, isRedirecting, storeConversationAndRedirect, agentId, scenarioInfo, endConversation]);

  const conversation: ElevenLabsConversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      // Use the common conversation end handler
      handleConversationEnd();
    },
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  });

  // Update handleStop to always work, even if there were previous redirect flags
  const handleStop = useCallback(async () => {
    // First check if we're already handling a stop
    if (isHandlingStop) {
      console.log('Already handling stop, skipping');
      return;
    }

    // If redirect flags are set but we have an active conversation,
    // clear the flags as they might be stale
    if ((isRedirecting.current || hasInitiatedRedirect.current || ConversationStorage.isRedirectInProgress()) 
        && activeConversationId) {
      console.log('Found active conversation with redirect flags - resetting flags');
      isRedirecting.current = false;
      hasInitiatedRedirect.current = false;
      ConversationStorage.forceResetRedirectFlags();
    }

    setIsHandlingStop(true);

    try {
      console.log('Manual stop initiated for conversation:', activeConversationId);
      const endTime = new Date().toISOString();
      
      // End ElevenLabs session
      try {
        await conversation.endSession();
      } catch (sessionError) {
        console.warn('Error ending ElevenLabs session:', sessionError);
        // Continue despite session ending error
      }
      
      // Explicitly call our handler because sometimes onDisconnect isn't reliable
      await handleConversationEnd(endTime);
    } catch (error) {
      console.error('Failed to stop conversation:', error);
      
      // Still try to redirect if not already redirecting
      if (!isSignedIn && !isRedirecting.current && !hasInitiatedRedirect.current) {
        isRedirecting.current = true;
        hasInitiatedRedirect.current = true;
        
        // Also inform the storage service
        ConversationStorage.beginRedirect();
        
        setTimeout(() => {
          window.location.href = '/sign-in';
        }, 50);
      }
    } finally {
      setIsHandlingStop(false);
    }
  }, [conversation, isSignedIn, isHandlingStop, handleConversationEnd, isRedirecting, hasInitiatedRedirect, activeConversationId]);

  // Update cleanup effect to better clean up localStorage
  useEffect(() => {
    return () => {
      // Skip cleanup if redirect is already in progress
      if (isRedirecting.current || hasInitiatedRedirect.current || ConversationStorage.isRedirectInProgress()) {
        console.log('Cleanup: redirect already in progress, skipping');
        return;
      }
      
      const pendingId = pendingConversation?.elevenLabsConversationId;
      const storedId = ConversationStorage.getActiveConversationId();
      const conversationId = activeConversationId || pendingId || storedId;
      
      if (conversationId) {
        console.log('Cleanup: handling conversation end for', conversationId);
        // Use the common conversation end handler on component unmount
        handleConversationEnd();
      } else {
        // No active conversation, clean up any stale data
        ConversationStorage.clearAll();
      }
    };
  }, [activeConversationId, pendingConversation, handleConversationEnd, isRedirecting, hasInitiatedRedirect]);

  const handleStart = useCallback(async () => {
    if (!hasAudioPermission) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasAudioPermission(true);
      } catch (error) {
        console.error('Microphone permission denied:', error);
        return;
      }
    }
    
    try {
      // Start the conversation with ElevenLabs
      const startTime = new Date().toISOString();
      // Don't include onDisconnect here, it's already handled in the useConversation hook
      const conversationId = await conversation.startSession({
        agentId
      });
      
      if (conversationId && typeof conversationId === 'string') {
        setActiveConversationId(conversationId);
        // Store conversation data with all necessary info
        const result = await startConversation(agentId);
        setPendingConversation({
          elevenLabsConversationId: conversationId,
          agentId,
          startTime: result.startTime,
          scenarioInfo
        });
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation, agentId, startConversation, scenarioInfo, hasAudioPermission]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setHasAudioPermission(true);
      })
      .catch((error) => {
        console.error('Audio permission denied:', error);
      });
  }, []);

  const isConnected = conversation.status === 'connected';

  const [section, subsection] = translationPath.split('.');
  const getText = (key: string): string => {
    if (subsection) {
      const sectionData = t(section, subsection);
      return (sectionData[key as keyof typeof sectionData] || key) as string;
    }
    return (t(section, key) || key) as string;
  };

  useEffect(() => {
    console.log('ElevenLabsWidget mounted with agent ID:', agentId);
    
    if (conversation?.status) {
      console.log('Conversation status changed:', conversation.status);
    }
    
    return () => {
      console.log('ElevenLabsWidget unmounting');
    };
  }, [agentId, conversation?.status]);

  // Add a beforeunload event handler to ensure conversation data is preserved
  useEffect(() => {
    const handleBeforeUnload = () => {
      // If we have an active conversation and a redirect is in progress
      if ((activeConversationId || pendingConversation) && 
          (isRedirecting.current || hasInitiatedRedirect.current)) {
        // Make sure the redirect flag is set to prevent cleanup
        ConversationStorage.beginRedirect();
        
        // Do not return anything or set event.returnValue
        // to prevent browser warning dialogs
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeConversationId, pendingConversation, isRedirecting, hasInitiatedRedirect]);

  return (
    <div className="w-[600px]">
      <div className={cn(
        "h-[180px] bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-[0_0_40px_rgba(93,207,161,0.15)]",
        "border border-willow-primary/20 transition-all duration-300",
        isConnected && "shadow-[0_0_60px_rgba(93,207,161,0.3)]"
      )}>
        <div className="flex flex-col items-center justify-between h-full">
          <div className="w-full h-[60px] flex items-center justify-center overflow-hidden rounded-lg">
            <WaveAnimation 
              isListening={isConnected ? !conversation.isSpeaking : false}
              className="rounded-lg"
            />
          </div>

          <div className="text-sm text-gray-600 h-[20px] flex items-center justify-center">
            {!hasAudioPermission ? (
              getText('micPermission')
            ) : !isConnected ? (
              getText('button')
            ) : conversation.isSpeaking ? (
              getText('speaking')
            ) : (
              getText('listening')
            )}
          </div>

          <div className="w-full">
            {hasAudioPermission ? (
              <Button
                onClick={isConnected ? handleStop : handleStart}
                disabled={!hasAudioPermission}
                className={cn(
                  "w-full h-[44px] transition-all duration-300 rounded-3xl",
                  "bg-black hover:bg-black/90 text-white"
                )}
              >
                {isConnected ? (
                  <>
                    <PhoneOff className="w-4 h-4 mr-2" />
                    {getText('endCall')}
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4 mr-2" />
                    {getText('startCall')}
                  </>
                )}
              </Button>
            ) : (
              <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg text-center h-[44px] flex items-center justify-center">
                {getText('micPermission')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}