"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { MessageCircle, Clock, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSupabase } from '@/context/SupabaseContext';

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

interface ScenarioInfo {
  title: string;
  skill_ids: number[];
  scenario_id: number;
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
  scenario_info: ScenarioInfo;
}

interface SkillProgress {
  skill_id: number;
  current_level: {
    level: string;
    success_rate: number;
    last_updated: string;
  };
  practice_history: {
    total_minutes: number;
    session_count: number;
    success_rate_trend: number[];
  };
}

interface ConversationDetails extends Conversation {
  skill_progress?: SkillProgress[];
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
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetails | null>(null);
  const supabase = useSupabase();

  // Function to fetch conversations
  const fetchConversations = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('user_conversations')
        .select(`
          *,
          scenario_info
        `)
        .eq('clerk_id', user.id)
        .order('start_time', { ascending: false });

      if (conversationsError) {
        throw conversationsError;
      }

      setConversations(conversationsData);
    } catch (error) {
      // Handle error silently or show a user-friendly message
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch conversation with skill progress
  const fetchConversationDetails = async (conversation: Conversation) => {
    try {
      const { data: skillProgress } = await supabase
        .from('user_skill_tracking')
        .select('*')
        .eq('clerk_id', conversation.clerk_id)
        .in('skill_id', conversation.skill_ids);

      setSelectedConversation({
        ...conversation,
        skill_progress: skillProgress
      });
    } catch (error) {
      // Handle error silently or show a user-friendly message
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    fetchConversationDetails(conversation);
  };

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchConversations();

    // Set up real-time subscription
    const channel = supabase
      .channel('user_conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_conversations',
          filter: `clerk_id=eq.${user.id}`
        },
        () => {
          fetchConversations(); // Reload data when changes occur
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      channel.unsubscribe();
    };
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
              onClick={() => handleConversationClick(conversation)}
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-gray-400" />
                <div>
                  <h3 className="font-medium text-gray-900">
                    {conversation.scenario_info?.title || 'Untitled Conversation'}
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
                        <h3 className="font-semibold mb-2 text-black">Call Status</h3>
                        <p className={`text-black px-3 py-1 rounded-full inline-block ${
                          selectedConversation.analysis?.call_successful === "success" 
                            ? "bg-green-100" 
                            : "bg-red-100"
                        }`}>
                          {selectedConversation.analysis?.call_successful}
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2 text-black">Summary</h3>
                        <p className="text-black whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                          {selectedConversation.analysis?.transcript_summary}
                        </p>
                      </div>
                      
                      {Object.keys(selectedConversation.analysis?.data_collection_results || {}).length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2 text-black">Data Collection Results</h3>
                          <div className="space-y-4">
                            {Object.entries(selectedConversation.analysis.data_collection_results).map(([key, value]: [string, any]) => (
                              <div key={key} className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium capitalize mb-2 text-black">{key.replace(/_/g, ' ')}</h4>
                                <p className="text-black mb-2">{value.value}</p>
                                <p className="text-gray-600">{value.rationale}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {Object.keys(selectedConversation.analysis?.evaluation_criteria_results || {}).length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2 text-black">Evaluation Criteria Results</h3>
                          <div className="space-y-4">
                            {Object.entries(selectedConversation.analysis.evaluation_criteria_results).map(([key, value]: [string, any]) => (
                              <div key={key} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium capitalize text-black">
                                    {key.replace(/_/g, ' ')}
                                  </h4>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    value.result === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                  }`}>
                                    {value.result}
                                  </span>
                                </div>
                                <p className="text-gray-600">{value.rationale}</p>
                                <p className="text-sm text-gray-500 mt-2">Criteria ID: {value.criteria_id}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedConversation?.skill_progress && (
                        <div>
                          <h3 className="font-semibold mb-4 text-black">Skills Progress</h3>
                          <div className="grid gap-4">
                            {selectedConversation.skill_progress.map((skill) => (
                              <div key={skill.skill_id} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-black">
                                    Skill {skill.skill_id}
                                  </h4>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    skill.current_level.level === 'developing' 
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {skill.current_level.level}
                                  </span>
                                </div>
                                
                                <div className="space-y-2">
                                  {/* Success Rate */}
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Success Rate</span>
                                    <span className="font-medium text-black">
                                      {(skill.current_level.success_rate * 100).toFixed(1)}%
                                    </span>
                                  </div>

                                  {/* Practice Sessions */}
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Practice Sessions</span>
                                    <span className="font-medium text-black">
                                      {skill.practice_history.session_count}
                                    </span>
                                  </div>

                                  {/* Total Practice Time */}
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Total Practice Time</span>
                                    <span className="font-medium text-black">
                                      {skill.practice_history.total_minutes.toFixed(1)} minutes
                                    </span>
                                  </div>

                                  {/* Success Trend */}
                                  <div className="mt-4">
                                    <div className="text-sm text-gray-600 mb-2">Success Trend</div>
                                    <div className="flex gap-1 h-4">
                                      {skill.practice_history.success_rate_trend.map((rate, idx) => (
                                        <div
                                          key={idx}
                                          className={`flex-1 rounded ${
                                            rate > 0 ? 'bg-green-200' : 'bg-gray-200'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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