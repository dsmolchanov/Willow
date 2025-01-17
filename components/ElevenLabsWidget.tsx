"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useConversation } from '@11labs/react';
import { useConversationTracking } from '@/hooks/useConversationTracking';
import { Button } from '@/components/ui/button';
import { PhoneCall, PhoneOff } from 'lucide-react';
import { WaveAnimation } from './ui/wave-animation';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useUser } from "@clerk/nextjs";

interface ElevenLabsWidgetProps {
  agentId: string;
  translationPath?: 'widget' | 'buddha.widget';
  scenarioInfo: {
    scenario_id: number;
    title: string;
    skill_ids: number[];
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
  const { startTracking, endTracking, conversationData, createConversationRecord } = useConversationTracking();
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [isHandlingStop, setIsHandlingStop] = useState(false);
  
  const storeConversationAndRedirect = useCallback(async (endTime: string) => {
    if (conversationData) {
      try {
        // Store complete conversation data in localStorage
        const pendingConversations = JSON.parse(
          localStorage.getItem('willow_pending_conversations') || '[]'
        );
        
        const conversationRecord = {
          id: conversationData.elevenLabsConversationId,
          agentId: conversationData.agentId,
          startTime: conversationData.startTime,
          endTime: endTime,
          storedAt: new Date().toISOString(),
          status: 'pending'
        };
        
        pendingConversations.push(conversationRecord);
        localStorage.setItem(
          'willow_pending_conversations', 
          JSON.stringify(pendingConversations)
        );
        
        // Create URL parameters for sign-in redirect
        const searchParams = new URLSearchParams({
          conversation: conversationData.elevenLabsConversationId,
          agent: conversationData.agentId,
          start_time: conversationData.startTime,
          end_time: endTime
        });
        
        router.push(`/sign-in?${searchParams.toString()}`);
      } catch (error) {
        console.error('Failed to store conversation:', error);
        router.push('/sign-in');
      }
    } else {
      console.warn('No conversation data available');
      router.push('/sign-in');
    }
  }, [conversationData, router]);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
    },
    onDisconnect: async () => {
      console.log('Disconnected from ElevenLabs');
      
      try {
        const endTime = new Date().toISOString();
        endTracking(endTime);
        
        // Wait for state update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!isSignedIn) {
          await storeConversationAndRedirect(endTime);
        }
      } catch (error) {
        console.error('Error in onDisconnect:', error);
        if (!isSignedIn) {
          await storeConversationAndRedirect(new Date().toISOString());
        }
      }
    },
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  });

  // Add a cleanup function to handle component unmounting
  useEffect(() => {
    return () => {
      console.log('ElevenLabsWidget unmounting, conversation data:', conversationData);
    };
  }, [conversationData]);

  const handleStart = useCallback(async () => {
    try {
      const conversationId = await conversation.startSession({ agentId });
      console.log('ElevenLabs session response:', conversationId);
      
      if (conversationId && typeof conversationId === 'string') {
        // Store in memory with scenario info
        startTracking({
          elevenLabsConversationId: conversationId,
          agentId,
          startTime: new Date().toISOString(),
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
      console.log('Stop handling - User status:', { 
        isSignedIn, 
        userId: user?.id, 
        conversationData: conversation.elevenLabsConversationId
      });

      const endTime = new Date().toISOString();
      
      // End ElevenLabs session
      await conversation.endSession();
      
      if (isSignedIn && user) {
        try {
          await endTracking({
            elevenLabsConversationId: conversation.elevenLabsConversationId,
            endTime,
            success: true
          });
          router.push('/dashboard');
        } catch (error) {
          console.error('Failed to store conversation:', error);
          router.push('/dashboard');
        }
      } else if (!isSignedIn) {
        await storeConversationAndRedirect(endTime);
      }
    } catch (error) {
      console.error('Failed to stop conversation:', error);
      if (!isSignedIn) {
        await storeConversationAndRedirect(new Date().toISOString());
      }
    } finally {
      setIsHandlingStop(false);
    }
  }, [
    conversation, 
    isSignedIn, 
    router, 
    endTracking, 
    user, 
    isHandlingStop, 
    storeConversationAndRedirect
  ]);

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
  const getText = (key: string) => subsection ? t(section, subsection)[key] : t(section, key);

  // Add cleanup effect to log state on unmount
  useEffect(() => {
    return () => {
      console.log('ElevenLabsWidget unmounting - State:', {
        isSignedIn,
        userId: user?.id,
        conversationData,
        isHandlingStop
      });
    };
  }, [isSignedIn, user, conversationData, isHandlingStop]);

  console.log('Widget state:', {
    conversationId: conversation?.elevenLabsConversationId,
    isLoading: conversation?.isLoading,
    hasScenarioInfo: !!scenarioInfo,
    agentId,
    status: conversation?.status
  });

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