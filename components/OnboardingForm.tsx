"use client";
import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useConversation } from '@11labs/react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect } from 'react';

export function Conversation() {
  const router = useRouter();
  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => {
      console.log('Message:', message);
    },
    onError: (error) => console.error('Error:', error),
  });

  const supabase = createClientComponentClient();
  const [conversationDbId, setConversationDbId] = React.useState<number | null>(null);

  const [avatarUrl, setAvatarUrl] = React.useState<string>('https://drive.google.com/uc?export=view&id=16wO37tj7GPDybu5-COHMC_ieLx7Y9Fbz');

  const startConversation = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const session = await conversation.startSession({
        agentId: 'doXNIsa8qmit1NjLQxgT',
      });

      console.log('Started conversation with ID:', session.conversationId);

      if (!session.conversationId) {
        throw new Error('Failed to retrieve conversation ID');
      }

      const { data, error } = await supabase
        .from('user_conversations')
        .insert({
          agent_id: 'doXNIsa8qmit1NjLQxgT',
          elevenlabs_conversation_id: session.conversationId,
          status: 'unknown',
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setConversationDbId(data.conversation_id);

    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation, supabase]);

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error('Failed to stop conversation:', error);
    } finally {
      if (conversationDbId) {
        await supabase
          .from('user_conversations')
          .update({
            end_time: new Date().toISOString()
          })
          .eq('conversation_id', conversationDbId);
      }
    }
  }, [conversation, conversationDbId, supabase]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Chat with AI Assistant</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 relative flex items-center justify-center">
              {conversation.status === 'connected' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {conversation.isSpeaking ? (
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-3 bg-blue-500 animate-[soundWave_0.5s_ease-in-out_infinite]"></div>
                      <div className="w-1 h-4 bg-blue-500 animate-[soundWave_0.5s_ease-in-out_infinite_0.1s]"></div>
                      <div className="w-1 h-5 bg-blue-500 animate-[soundWave_0.5s_ease-in-out_infinite_0.2s]"></div>
                      <div className="w-1 h-4 bg-blue-500 animate-[soundWave_0.5s_ease-in-out_infinite_0.3s]"></div>
                      <div className="w-1 h-3 bg-blue-500 animate-[soundWave_0.5s_ease-in-out_infinite_0.4s]"></div>
                    </div>
                  ) : (
                    <div className="relative w-4 h-4">
                      <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                      <div className="relative w-4 h-4 bg-red-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={startConversation}
                disabled={conversation.status === 'connected'}
              >
                Start Conversation
              </Button>
              <Button
                onClick={stopConversation}
                disabled={conversation.status !== 'connected'}
                variant="destructive"
              >
                End Conversation
              </Button>
            </div>

            <div className="flex flex-col items-center text-center">
              <p>Status: {conversation.status}</p>
              <p>Agent is {conversation.isSpeaking ? 'speaking' : 'listening'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}