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

export function ElevenLabsWidget() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const { language, t } = useLanguage();
  const { startTracking, endTracking, conversationData, createConversationRecord } = useConversationTracking();
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  
  const agentId = language === 'ru' 
    ? "doXNIsa8qmit1NjLQxgT"
    : "cxRQ5scm1qhlOVdadUFp";

  const conversation = useConversation({
    onConnect: () => console.log('Connected to ElevenLabs'),
    onDisconnect: () => console.log('Disconnected from ElevenLabs'),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  });

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
    const endTime = new Date().toISOString();
    
    try {
      // End ElevenLabs session
      await conversation.endSession();
      
      // Update memory storage with end time
      endTracking(endTime);
      
      // Handle navigation
      if (isSignedIn && user) {
        // If user is signed in, we should handle the database operation here
        if (conversationData) {
          await createConversationRecord(user.id, {
            ...conversationData,
            endTime
          });
        }
        router.push('/dashboard');
      } else if (conversationData) {
        // If not signed in, pass data through URL
        const params = new URLSearchParams({
          reason: 'evaluation',
          conversation: conversationData.elevenLabsConversationId,
          agent: conversationData.agentId,
          start_time: conversationData.startTime,
          end_time: endTime,
          redirect_url: `/sign-in?${new URLSearchParams({
            conversation: conversationData.elevenLabsConversationId,
            agent: conversationData.agentId,
            start_time: conversationData.startTime,
            end_time: endTime
          })}`
        });
        
        router.push(`/sign-up?${params}`);
      }
    } catch (error) {
      console.error('Failed to stop conversation:', error);
    }
  }, [conversation, isSignedIn, router, conversationData, endTracking, user, createConversationRecord]);

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
              t('widget', 'micPermission')
            ) : !isConnected ? (
              t('callToAction', 'button')
            ) : conversation.isSpeaking ? (
              t('widget', 'speaking')
            ) : (
              t('widget', 'listening')
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
                    {t('widget', 'endCall')}
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4 mr-2" />
                    {t('widget', 'startCall')}
                  </>
                )}
              </Button>
            ) : (
              <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg text-center h-[44px] flex items-center justify-center">
                {t('widget', 'micPermission')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}