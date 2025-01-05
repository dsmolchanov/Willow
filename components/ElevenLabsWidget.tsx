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
}

export function ElevenLabsWidget({ agentId, translationPath = 'widget' }: ElevenLabsWidgetProps) {
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
        const pendingConversations = JSON.parse(localStorage.getItem('willow_pending_conversations') || '[]');
        
        const conversationRecord = {
          id: conversationData.elevenLabsConversationId,
          agentId: conversationData.agentId,
          startTime: conversationData.startTime,
          endTime: endTime,
          storedAt: new Date().toISOString(),
          status: 'pending'
        };
        
        // Add to pending conversations array
        pendingConversations.push(conversationRecord);
        
        // Store updated array
        localStorage.setItem('willow_pending_conversations', JSON.stringify(pendingConversations));
        
        // Also store in willow_conversation_params for compatibility
        const conversationParams = {
          conversation: conversationData.elevenLabsConversationId,
          agent: conversationData.agentId,
          start_time: conversationData.startTime,
          end_time: endTime
        };
        localStorage.setItem('willow_conversation_params', JSON.stringify(conversationParams));
        
        console.log('Stored conversation data:', conversationParams);
        
        // Create the URL with properly encoded parameters
        const searchParams = new URLSearchParams();
        Object.entries(conversationParams).forEach(([key, value]) => {
          if (value) searchParams.append(key, value);
        });
        
        const url = `/sign-in?${searchParams.toString()}`;
        console.log('Redirecting to:', url);
        
        // Use router.push for client-side navigation
        router.push(url);
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
        // Only store in memory, no database operation
        startTracking({
          elevenLabsConversationId: conversationId,
          agentId,
          startTime: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation, agentId, startTracking]);

  const handleStop = useCallback(async () => {
    // Prevent multiple executions
    if (isHandlingStop) return;
    setIsHandlingStop(true);

    try {
      const endTime = new Date().toISOString();
      
      // End ElevenLabs session
      await conversation.endSession();
      
      // Update memory storage with end time
      endTracking(endTime);
      
      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (isSignedIn && user) {
        if (conversationData) {
          try {
            await createConversationRecord(user.id, {
              ...conversationData,
              endTime
            });
            router.push('/dashboard');
          } catch (error) {
            console.error('Failed to store conversation:', error);
            router.push('/dashboard');
          }
        } else {
          router.push('/dashboard');
        }
      } else {
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
  }, [conversation, isSignedIn, router, conversationData, endTracking, user, createConversationRecord, isHandlingStop, storeConversationAndRedirect]);

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