"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { MessageCircle, Clock, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Message {
  role: string;
  message: string;
  feedback: any;
  tool_calls: any;
  tool_results: any;
  time_in_call_secs: number;
  conversation_turn_metrics: any;
}

interface Analysis {
  call_successful: string;
  transcript_summary: string;
  data_collection_results: {
    life_context: { value: string; rationale: string };
    stakes_level: { value: string; rationale: string };
    growth_motivation: { value: string; rationale: string };
    interaction_style: { value: string; rationale: string };
    confidence_pattern: { value: string; rationale: string };
  };
  evaluation_criteria_results: any;
}

interface Conversation {
  conversation_id: number;
  clerk_id: string;
  agent_id: string;
  elevenlabs_conversation_id: string;
  start_time: string;
  end_time: string;
  status: string;
  duration: number;
  replics_number: number;
  transcript: Message[];
  analysis: Analysis;
}

function formatTime(date: string) {
  const now = new Date();
  const conversationDate = new Date(date);
  
  // If today, show "Today, HH:MM AM/PM"
  if (conversationDate.toDateString() === now.toDateString()) {
    return `Today, ${conversationDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  // If last week, show "Last DayName, HH:MM AM/PM"
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  if (conversationDate > weekAgo) {
    return `Last ${conversationDate.toLocaleDateString('en-US', { weekday: 'long' })}, ${conversationDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  // Otherwise, show full date
  return conversationDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function ConversationsPage() {
  const { user } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_conversations')
          .select('*')
          .eq('clerk_id', user.id)
          .order('start_time', { ascending: false });

        if (error) throw error;

        setConversations(data || []);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [user, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Conversations</h1>
      
      {conversations.length === 0 ? (
        <p className="text-gray-500">No conversations yet.</p>
      ) : (
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.conversation_id}
              className="bg-white rounded-lg p-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
              onClick={() => setSelectedConversation(conversation)}
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-gray-400" />
                <div>
                  <h3 className="font-medium text-gray-900">
                    {conversation.agent_id === 'doXNIsa8qmit1NjLQxgT' ? 'Onboarding Russian' : 'Onboarding English'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatTime(conversation.start_time)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{conversation.replics_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{(conversation.duration / 60).toFixed(2)}</span>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  conversation.status === 'Success' ? 'bg-green-100 text-green-800' : 
                  conversation.status === 'Unknown' ? 'bg-gray-100 text-gray-800' : 
                  'bg-gray-100 text-gray-800'
                }`}>
                  {conversation.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={!!selectedConversation} onOpenChange={(open) => !open && setSelectedConversation(null)}>
        <SheetContent side="right" className="w-3/4 p-0 sm:max-w-none">
          <div className="flex flex-col h-[100vh]">
            <SheetHeader className="shrink-0 px-6 py-4 border-b">
              <SheetTitle className="flex items-center justify-between text-black">
                <span>Conversation Details</span>
                <button onClick={() => setSelectedConversation(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </SheetTitle>
            </SheetHeader>

            {selectedConversation && (
              <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                <TabsList className="shrink-0 px-6 border-b justify-start h-12 space-x-8 bg-transparent">
                  <TabsTrigger 
                    value="overview" 
                    className="text-sm font-medium text-gray-500 data-[state=active]:text-black relative px-1 pb-3 pt-2 border-none bg-transparent hover:text-black transition-colors data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-black"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="transcription" 
                    className="text-sm font-medium text-gray-500 data-[state=active]:text-black relative px-1 pb-3 pt-2 border-none bg-transparent hover:text-black transition-colors data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-black"
                  >
                    Transcription
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analysis" 
                    className="text-sm font-medium text-gray-500 data-[state=active]:text-black relative px-1 pb-3 pt-2 border-none bg-transparent hover:text-black transition-colors data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-black"
                  >
                    Analysis
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 min-h-0">
                  <TabsContent value="overview" className="h-full overflow-y-auto px-6 py-4 m-0">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-black">Conversation ID</h3>
                        <p className="text-black">{selectedConversation.elevenlabs_conversation_id}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">Duration</h3>
                        <p className="text-black">{selectedConversation.duration} seconds</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">Status</h3>
                        <p className="text-black">{selectedConversation.status}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">Replies</h3>
                        <p className="text-black">{selectedConversation.replics_number}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="transcription" className="h-full overflow-y-auto px-6 py-4 m-0">
                    <div className="space-y-4">
                      {selectedConversation.transcript?.map((message, index) => (
                        <div key={index} className={`flex ${message.role === 'agent' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'agent' ? 'bg-gray-100' : 'bg-blue-100'
                          }`}>
                            <p className="text-sm font-medium mb-1 text-black">{message.role === 'agent' ? 'Assistant' : 'User'}</p>
                            <p className="text-black">{message.message}</p>
                            <p className="text-xs text-gray-600 mt-1">Time: {message.time_in_call_secs}s</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="analysis" className="h-full overflow-y-auto px-6 py-4 m-0">
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2 text-black">Summary</h3>
                        <p className="text-black whitespace-pre-wrap">{selectedConversation.analysis?.transcript_summary}</p>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-2 text-black">Analysis Results</h3>
                        <div className="space-y-4">
                          {selectedConversation.analysis?.data_collection_results && Object.entries(selectedConversation.analysis.data_collection_results).map(([key, value]) => (
                            <div key={key} className="bg-gray-50 rounded-lg p-4">
                              <h4 className="font-medium capitalize mb-2 text-black">{key.replace('_', ' ')}</h4>
                              <p className="text-black mb-2">{value.value}</p>
                              <p className="text-gray-600">{value.rationale}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}