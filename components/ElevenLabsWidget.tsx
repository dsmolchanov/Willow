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
  const { isSignedIn, user } = useUser();
  const { language, t } = useLanguage();
  const { startTracking, endTracking, pendingConversation } = useConversationTracking();
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [isHandlingStop, setIsHandlingStop] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const isRedirecting = useRef(false);
  
  const storeConversationAndRedirect = useCallback(async (endTime: string) => {
    if (isRedirecting.current) {
      console.log('Already redirecting, skipping...');
      return;
    }

    if (pendingConversation) {
      try {
        isRedirecting.current = true;
        
        // Store complete conversation data in localStorage with more metadata
        const pendingConversations = JSON.parse(
          localStorage.getItem('willow_pending_conversations') || '[]'
        );
        
        const conversationRecord = {
          id: pendingConversation.elevenLabsConversationId,
          agentId: pendingConversation.agentId,
          startTime: pendingConversation.startTime,
          endTime: endTime,
          storedAt: new Date().toISOString(),
          status: 'pending',
          scenarioInfo: pendingConversation.scenarioInfo, // Include scenario info
          attempts: 0 // Track sync attempts
        };
        
        pendingConversations.push(conversationRecord);
        
        // Store both pending conversations and conversation params
        localStorage.setItem(
          'willow_pending_conversations', 
          JSON.stringify(pendingConversations)
        );
        
        localStorage.setItem(
          'willow_conversation_params',
          JSON.stringify({
            conversation: pendingConversation.elevenLabsConversationId,
            agent: pendingConversation.agentId,
            start_time: pendingConversation.startTime,
            end_time: endTime,
            scenario_info: pendingConversation.scenarioInfo
          })
        );
        
        // Create URL parameters for sign-in redirect
        const searchParams = new URLSearchParams({
          conversation: pendingConversation.elevenLabsConversationId,
          agent: pendingConversation.agentId,
          start_time: pendingConversation.startTime,
          end_time: endTime,
          return_to: '/dashboard' // Add return path
        });
        
        console.log('Storing conversation and redirecting:', {
          conversationId: pendingConversation.elevenLabsConversationId,
          status: 'pending'
        });
        
        router.push(`/sign-in?${searchParams.toString()}`);
      } catch (error) {
        console.error('Failed to store conversation:', error);
        isRedirecting.current = false; // Reset redirecting state on error
        router.push('/sign-in');
      }
    } else {
      console.warn('No conversation data available');
      router.push('/sign-in');
    }
  }, [pendingConversation, router]);

  const conversation: ElevenLabsConversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
    },
    onDisconnect: async () => {
      console.log('Disconnected from ElevenLabs');
      
      try {
        // Check for either active conversation ID or pending conversation
        const conversationId = activeConversationId || pendingConversation?.elevenLabsConversationId;
        
        if (!conversationId) {
          console.log('No conversation to handle on disconnect');
          return;
        }

        console.log('Handling disconnect for conversation:', conversationId);
        const endTime = new Date().toISOString();
        
        // End tracking first to update pendingConversation
        await endTracking({
          elevenLabsConversationId: conversationId,
          endTime,
          success: true
        });
        
        // Wait for state update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // For unsigned users, always redirect to sign-in
        if (!isSignedIn && !isRedirecting.current) {
          console.log('Unsigned user, storing conversation and redirecting');
          await storeConversationAndRedirect(endTime);
        } else if (isSignedIn && !isRedirecting.current) {
          console.log('Signed in user, redirecting to dashboard');
          isRedirecting.current = true;
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error in onDisconnect:', error);
        if (!isSignedIn && !isRedirecting.current) {
          isRedirecting.current = true;
          router.push('/sign-in');
        }
      } finally {
        setActiveConversationId(undefined);
      }
    },
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  });

  // Cleanup effect
  useEffect(() => {
    return () => {
      const pendingId = pendingConversation?.elevenLabsConversationId;
      if ((activeConversationId || pendingId) && !isRedirecting.current) {
        const endTime = new Date().toISOString();
        console.log('Handling cleanup for conversation:', {
          activeId: activeConversationId,
          pendingId,
          isRedirecting: isRedirecting.current
        });
        
        const conversationId = activeConversationId || pendingId;
        if (conversationId) {
          endTracking({
            elevenLabsConversationId: conversationId,
            endTime,
            success: true
          }).then(() => {
            if (!isSignedIn && !isRedirecting.current) {
              storeConversationAndRedirect(endTime);
            }
          }).catch(error => {
            console.error('Error in cleanup:', error);
            if (!isSignedIn && !isRedirecting.current) {
              router.push('/sign-in');
            }
          });
        }
      }
    };
  }, [activeConversationId, pendingConversation, endTracking, isSignedIn, storeConversationAndRedirect, router]);

  const handleStart = useCallback(async () => {
    try {
      const startTime = new Date().toISOString();
      const conversationId = await conversation.startSession({ 
        agentId,
        conversationId: undefined // Reset any existing conversation ID
      });
      console.log('ElevenLabs session response:', conversationId);
      
      if (conversationId && typeof conversationId === 'string') {
        setActiveConversationId(conversationId);
        // Store conversation data with all necessary info
        startTracking({
          elevenLabsConversationId: conversationId,
          agentId,
          startTime,
          scenarioInfo
        });
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation, agentId, startTracking, scenarioInfo]);

  const handleStop = useCallback(async () => {
    if (isHandlingStop) return;
    setIsHandlingStop(true);

    try {
      const endTime = new Date().toISOString();
      
      // End ElevenLabs session - this will trigger onDisconnect
      await conversation.endSession();
    } catch (error) {
      console.error('Failed to stop conversation:', error);
      if (!isSignedIn) {
        router.push('/sign-in');
      }
    } finally {
      setIsHandlingStop(false);
    }
  }, [conversation, isSignedIn, isHandlingStop]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        console.log('Audio permission granted');
        setHasAudioPermission(true);
      })
      .catch((error) => {
        console.error('Audio permission denied:', error);
      });
  }, []);

  const isConnected = conversation.status === 'connected';

  // Split the path for nested translations
  const [section, subsection] = translationPath.split('.');
  const getText = (key: string): string => {
    if (subsection) {
      const sectionData = t(section, subsection);
      return (sectionData[key as keyof typeof sectionData] || key) as string;
    }
    return (t(section, key) || key) as string;
  };

  // Add cleanup effect to log state on unmount
  useEffect(() => {
    return () => {
      console.log('ElevenLabsWidget unmounting - State:', {
        isSignedIn,
        userId: user?.id,
        conversationData: pendingConversation,
        isHandlingStop
      });
    };
  }, [isSignedIn, user, pendingConversation, isHandlingStop]);

  // Add effect to log conversation state changes
  useEffect(() => {
    console.log('Conversation state updated:', {
      conversationId: activeConversationId,
      status: conversation?.status,
      isConnected: conversation?.status === 'connected'
    });
  }, [activeConversationId, conversation?.status]);

  console.log('Widget state:', {
    conversationId: activeConversationId,
    isLoading: conversation?.isLoading,
    hasScenarioInfo: !!scenarioInfo,
    agentId,
    status: conversation?.status
  });

  useEffect(() => {
    // Update any language-dependent logic when language changes
    // This might include voice settings, recognition language, etc.
  }, [language]);

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