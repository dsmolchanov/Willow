'use client';

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { PlayCircle, Clock, X, Target } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserScenario {
  user_scenario_id: number;
  clerk_id: string;
  scenario_id: number;
  start_time: string;
  end_time: string | null;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Failed';
  score: number | null;
  feedback: string | null;
  context_data: any;
  skill_objectives: any;
  practice_metrics: any;
  growth_indicators: any;
}

function formatTime(date: string) {
  const now = new Date();
  const scenarioDate = new Date(date);
  
  if (scenarioDate.toDateString() === now.toDateString()) {
    return `Today, ${scenarioDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  if (scenarioDate > weekAgo) {
    return `Last ${scenarioDate.toLocaleDateString('en-US', { weekday: 'long' })}, ${scenarioDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  return scenarioDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getDuration(start: string, end: string | null): string {
  if (!end) return 'In progress';
  const duration = (new Date(end).getTime() - new Date(start).getTime()) / 1000; // in seconds
  return `${(duration / 60).toFixed(2)} min`;
}

export default function TasksPage() {
  const { user } = useUser();
  const [scenarios, setScenarios] = useState<UserScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<UserScenario | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchScenarios = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_scenarios')
          .select('*, scenarios(*)')
          .eq('clerk_id', user.id)
          .order('start_time', { ascending: false });

        if (error) throw error;

        setScenarios(data || []);
      } catch (error) {
        console.error('Error fetching scenarios:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScenarios();
  }, [user, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Practice Tasks</h1>
      
      {scenarios.length === 0 ? (
        <p className="text-gray-500">No practice tasks yet.</p>
      ) : (
        <div className="space-y-2">
          {scenarios.map((scenario) => (
            <div
              key={scenario.user_scenario_id}
              className="bg-white rounded-lg p-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
              onClick={() => setSelectedScenario(scenario)}
            >
              <div className="flex items-center gap-3">
                <PlayCircle className="w-5 h-5 text-gray-400" />
                <div>
                  <h3 className="font-medium text-gray-900">
                    {scenario.scenarios?.title || 'Untitled Scenario'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatTime(scenario.start_time)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {scenario.score ? `${scenario.score}%` : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {getDuration(scenario.start_time, scenario.end_time)}
                  </span>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  scenario.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                  scenario.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 
                  scenario.status === 'Failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {scenario.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={!!selectedScenario} onOpenChange={(open) => !open && setSelectedScenario(null)}>
        <SheetContent side="right" className="w-3/4 p-0 sm:max-w-none">
          <div className="flex flex-col h-[100vh]">
            <SheetHeader className="shrink-0 px-6 py-4 border-b">
              <SheetTitle className="flex items-center justify-between text-black">
                <span>Task Details</span>
                <button onClick={() => setSelectedScenario(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </SheetTitle>
            </SheetHeader>

            {selectedScenario && (
              <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                <TabsList className="shrink-0 px-6 border-b justify-start h-12 space-x-8 bg-transparent">
                  <TabsTrigger 
                    value="overview" 
                    className="text-sm font-medium text-gray-500 data-[state=active]:text-black relative px-1 pb-3 pt-2 border-none bg-transparent hover:text-black transition-colors data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-black"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="objectives" 
                    className="text-sm font-medium text-gray-500 data-[state=active]:text-black relative px-1 pb-3 pt-2 border-none bg-transparent hover:text-black transition-colors data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-black"
                  >
                    Objectives
                  </TabsTrigger>
                  <TabsTrigger 
                    value="feedback" 
                    className="text-sm font-medium text-gray-500 data-[state=active]:text-black relative px-1 pb-3 pt-2 border-none bg-transparent hover:text-black transition-colors data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-black"
                  >
                    Feedback
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 min-h-0">
                  <TabsContent value="overview" className="h-full overflow-y-auto px-6 py-4 m-0">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-black">Task ID</h3>
                        <p className="text-black">{selectedScenario.user_scenario_id}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">Duration</h3>
                        <p className="text-black">
                          {getDuration(selectedScenario.start_time, selectedScenario.end_time)}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">Status</h3>
                        <p className="text-black">{selectedScenario.status}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">Score</h3>
                        <p className="text-black">{selectedScenario.score ? `${selectedScenario.score}%` : 'Not scored yet'}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="objectives" className="h-full overflow-y-auto px-6 py-4 m-0">
                    <div className="space-y-4">
                      {selectedScenario.skill_objectives && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-black mb-2">Skill Objectives</h4>
                          <pre className="text-sm whitespace-pre-wrap text-black">
                            {JSON.stringify(selectedScenario.skill_objectives, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedScenario.practice_metrics && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-black mb-2">Practice Metrics</h4>
                          <pre className="text-sm whitespace-pre-wrap text-black">
                            {JSON.stringify(selectedScenario.practice_metrics, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="feedback" className="h-full overflow-y-auto px-6 py-4 m-0">
                    <div className="space-y-6">
                      {selectedScenario.feedback && (
                        <div>
                          <h3 className="font-semibold mb-2 text-black">Performance Feedback</h3>
                          <p className="text-black whitespace-pre-wrap">{selectedScenario.feedback}</p>
                        </div>
                      )}
                      {selectedScenario.growth_indicators && (
                        <div>
                          <h3 className="font-semibold mb-2 text-black">Growth Indicators</h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <pre className="text-sm whitespace-pre-wrap text-black">
                              {JSON.stringify(selectedScenario.growth_indicators, null, 2)}
                            </pre>
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