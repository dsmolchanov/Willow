"use client";

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, BookOpen, Clock, X, GraduationCap, Dumbbell, History, ChevronRight } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { ElevenLabsWidget } from './ElevenLabsWidget';
import { useSupabase } from '@/context/SupabaseContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Skill {
  skill_id: number;
  name: string;
  theory?: string;
  new_theory?: string;
  level: number;
  skill_number?: string;
  parent_skill_id?: number;
  eval_prompt?: string;
}

interface Scenario {
  scenario_id: number;
  title: string;
  description: string;
  created_at: string;
  skill_ids: number[];
  agent_id: string | null;
  agent_status: 'pending' | 'processing' | 'completed' | 'failed';
  difficulty_level: string | null;
  clerk_id: string;
  language: string;
  voice_id: string | null;
}

function formatDate(date: string) {
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

export default function LessonsPage() {
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [expandedSkillId, setExpandedSkillId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('theory');

  // Function to handle URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const scenarioId = searchParams.get('scenario');
    const tab = searchParams.get('tab');
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (scenarioId && scenarios.length > 0) {
      const scenario = scenarios.find(s => s.scenario_id === parseInt(scenarioId));
      if (scenario) {
        // Fetch the latest scenario data to ensure we have the most up-to-date agent_id and status
        const fetchLatestScenario = async () => {
          try {
            const { data, error } = await supabase
              .from('scenarios')
              .select('*')
              .eq('scenario_id', scenario.scenario_id)
              .single();

            if (error) {
              console.error('Error fetching latest scenario:', error);
              setSelectedScenario(scenario);
              return;
            }

            if (data) {
              // If we have an agent_id but status is still pending, consider it completed
              const effectiveStatus = (data.agent_id && data.agent_status === 'pending') ? 'completed' : data.agent_status;
              setSelectedScenario({
                ...data,
                agent_status: effectiveStatus
              });
            } else {
              setSelectedScenario(scenario);
            }
          } catch (err) {
            console.error('Error in fetchLatestScenario:', err);
            setSelectedScenario(scenario);
          }
        };

        fetchLatestScenario();
      }
    }
  }, [scenarios, supabase]);

  // Function to check agent status
  const checkAgentStatus = async (scenario: Scenario) => {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('agent_status, agent_id')
        .eq('scenario_id', scenario.scenario_id)
        .single();

      if (error) {
        console.error('Error checking agent status:', error);
        return false;
      }

      if (data) {
        // If we have an agent_id but status is still pending, consider it completed
        const effectiveStatus = (data.agent_id && data.agent_status === 'pending') ? 'completed' : data.agent_status;
        
        const updatedScenario = { 
          ...scenario, 
          ...data,
          agent_status: effectiveStatus
        };
        
        setSelectedScenario(updatedScenario);
        
        // Update the scenario in the list as well
        setScenarios(prevScenarios => 
          prevScenarios.map(s => 
            s.scenario_id === scenario.scenario_id ? updatedScenario : s
          )
        );
        
        // If the status is 'failed' or 'completed', stop polling
        return effectiveStatus === 'failed' || effectiveStatus === 'completed';
      }
      return false;
    } catch (err) {
      console.error('Error in checkAgentStatus:', err);
      return false;
    }
  };

  // Effect to check agent status when scenario is selected
  useEffect(() => {
    if (!selectedScenario?.scenario_id) return;

    // Initial check
    checkAgentStatus(selectedScenario);

    // Set up polling only if status is not final
    if (selectedScenario.agent_status !== 'completed' && selectedScenario.agent_status !== 'failed') {
      const interval = setInterval(() => {
        checkAgentStatus(selectedScenario);
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [selectedScenario?.scenario_id]);

  // Function to load scenarios
  const loadScenarios = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('scenarios')
        .select(`
          scenario_id,
          title,
          description,
          created_at,
          skill_ids,
          agent_id,
          agent_status,
          difficulty_level,
          clerk_id,
          language,
          voice_id
        `)
        .eq('clerk_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
        return;
      }

      setScenarios(data || []);

    } catch (err) {
      setError('An unexpected error occurred while loading scenarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !user) {
      setIsLoading(false);
      return;
    }

    loadScenarios();
  }, [user, isLoaded]);

  // Load skills when a scenario is selected
  useEffect(() => {
    if (!selectedScenario) return;
    if (!selectedScenario.skill_ids || selectedScenario.skill_ids.length === 0) return;

    const loadSkills = async () => {
      try {
        // Fetch skills directly from skill_translations table
        const { data: skillsData, error: skillsError } = await supabase
          .from('skill_translations')
          .select(`
            skill_id,
            name,
            theory,
            new_theory,
            level,
            skill_number,
            parent_skill_id,
            eval_prompt
          `)
          .in('skill_id', selectedScenario.skill_ids)
          .eq('language', selectedScenario.language);

        if (skillsError) {
          console.error('Error loading skills:', skillsError);
          return;
        }

        setSkills(skillsData || []);
      } catch (err) {
        console.error('Error in loadSkills:', err);
      }
    };

    loadSkills();
  }, [selectedScenario, supabase]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading user data...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Please sign in to view lessons</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading scenarios...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Your Lessons</h1>
        
        {scenarios.length === 0 ? (
          <p className="text-gray-500">No lessons available yet.</p>
        ) : (
          <div className="space-y-2">
            {scenarios.map((scenario) => (
              <div
                key={`scenario-${scenario.scenario_id}`}
                className="bg-white/50 dark:bg-black/50 backdrop-blur-sm p-4 rounded-lg shadow hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center justify-between cursor-pointer"
                onClick={() => setSelectedScenario(scenario)}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="font-medium text-foreground">
                      {scenario.title}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-muted-foreground">{formatDate(scenario.created_at)}</span>
                  </div>
                  <div className="flex gap-2">
                    {Array.isArray(scenario.skill_ids) && scenario.skill_ids.map((skillId) => (
                      <span 
                        key={`scenario-${scenario.scenario_id}-skill-${skillId}`}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                      >
                        {skillId}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!selectedScenario} onOpenChange={(open) => {
        if (!open) {
          setSelectedScenario(null);
          setExpandedSkillId(null);
          window.history.replaceState({}, '', window.location.pathname);
        }
      }}>
        <SheetContent 
          side="right" 
          className="w-3/4 p-0 sm:max-w-none overflow-y-auto"
        >
          <SheetHeader className="shrink-0 px-6 py-4 border-b">
            <SheetTitle className="flex items-center justify-between text-black">
              <span>{selectedScenario?.title}</span>
              <button onClick={() => setSelectedScenario(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Scenario details and conversation interface
            </SheetDescription>
          </SheetHeader>

          {selectedScenario && (
            <div className="flex flex-col h-[calc(100vh-5rem)] relative">
              <Tabs defaultValue={activeTab} className="flex-1 flex flex-col min-h-0" onValueChange={(value) => setActiveTab(value)}>
                <TabsList className="shrink-0 px-6 border-b justify-start h-12 space-x-8 bg-transparent">
                  <TabsTrigger 
                    value="theory" 
                    className="text-sm font-medium text-gray-500 data-[state=active]:text-black relative px-1 pb-3 pt-2 border-none bg-transparent hover:text-black transition-colors data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-black"
                  >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Theory
                  </TabsTrigger>
                  <TabsTrigger 
                    value="practice" 
                    className="text-sm font-medium text-gray-500 data-[state=active]:text-black relative px-1 pb-3 pt-2 border-none bg-transparent hover:text-black transition-colors data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-black"
                  >
                    <Dumbbell className="w-4 h-4 mr-2" />
                    Practice
                  </TabsTrigger>
                  <TabsTrigger 
                    value="history" 
                    className="text-sm font-medium text-gray-500 data-[state=active]:text-black relative px-1 pb-3 pt-2 border-none bg-transparent hover:text-black transition-colors data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-black"
                  >
                    <History className="w-4 h-4 mr-2" />
                    History
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 min-h-0">
                  <TabsContent value="theory" className="h-full overflow-y-auto px-6 py-4 m-0">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--willow-olive))]">Skills to Learn</h3>
                      {skills.length > 0 ? (
                        <div className="space-y-2">
                          {skills.map((skill) => (
                            <div key={`skill-${skill.skill_id}`}>
                              <div
                                className="flex items-center justify-between p-4 bg-[hsl(var(--willow-sage))] dark:bg-[hsl(var(--willow-olive)_/_0.1)] rounded-lg cursor-pointer hover:bg-[hsl(var(--willow-lime)_/_0.1)] dark:hover:bg-[hsl(var(--willow-olive)_/_0.2)] transition-colors border border-[hsl(var(--willow-lime)_/_0.2)]"
                                onClick={() => setExpandedSkillId(expandedSkillId === skill.skill_id ? null : skill.skill_id)}
                              >
                                <div className="flex items-center gap-3">
                                  <ChevronRight 
                                    className={`w-4 h-4 text-[hsl(var(--willow-olive))] transition-transform ${expandedSkillId === skill.skill_id ? 'transform rotate-90' : ''}`}
                                  />
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-[hsl(var(--willow-olive)_/_0.6)]">
                                      {skill.skill_number || skill.skill_id}
                                    </span>
                                    <h4 className="font-medium text-[hsl(var(--willow-olive))]">
                                      {skill.name}
                                    </h4>
                                  </div>
                                </div>
                                <div className="text-xs text-[hsl(var(--willow-olive)_/_0.8)]">
                                  Level {skill.level}
                                </div>
                              </div>
                              {expandedSkillId === skill.skill_id && skill.new_theory && (
                                <div className="mt-2 p-4 bg-[hsl(var(--willow-cream)_/_0.3)] rounded-lg prose dark:prose-invert max-w-none">
                                  <div className="text-[hsl(var(--willow-olive))]">
                                    <Markdown>{skill.new_theory}</Markdown>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[hsl(var(--willow-olive)_/_0.6)]">No skills associated with this lesson.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="practice" className="h-full overflow-y-auto px-6 py-4 m-0">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--willow-olive))]">Practice Scenario</h3>
                      <div className="prose max-w-none">
                        <div className="space-y-6">
                          <div className="bg-[hsl(var(--willow-sage))] dark:bg-[hsl(var(--willow-olive)_/_0.1)] backdrop-blur-sm p-6 rounded-lg border border-[hsl(var(--willow-lime)_/_0.2)]">
                            <h2 className="text-xl font-semibold text-[hsl(var(--willow-olive))] mb-4">{selectedScenario.title}</h2>
                            <div className="space-y-6">
                              <Markdown 
                                components={{
                                  h1: ({children}) => <h3 className="text-lg font-semibold text-[hsl(var(--willow-olive))] mt-6 mb-3">{children}</h3>,
                                  h2: ({children}) => <h4 className="text-base font-medium text-[hsl(var(--willow-olive)_/_0.8)] mt-4 mb-2">{children}</h4>,
                                  p: ({children}) => <p className="text-[hsl(var(--willow-olive))] leading-relaxed mb-4 bg-[hsl(var(--willow-cream)_/_0.3)] p-3 rounded-md">{children}</p>
                                }}
                              >
                                {selectedScenario.description}
                              </Markdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="h-full overflow-y-auto px-6 py-4 m-0">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold mb-4">Conversation History</h3>
                      <p className="text-muted-foreground">Coming soon...</p>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Floating ElevenLabs Widget */}
              {selectedScenario.agent_id && (
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                  <ElevenLabsWidget 
                    agentId={selectedScenario.agent_id}
                    translationPath="widget"
                    scenarioInfo={{
                      scenario_id: selectedScenario.scenario_id,
                      title: selectedScenario.title,
                      skill_ids: selectedScenario.skill_ids,
                      type: 'lesson'
                    }}
                  />
                </div>
              )}

              {/* Status indicator - only show when there's no agent_id */}
              {!selectedScenario.agent_id && selectedScenario.agent_status === 'processing' && (
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full">
                  Creating conversation agent...
                </div>
              )}

              {selectedScenario.agent_status === 'failed' && (
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-red-100 text-red-800 px-4 py-2 rounded-full">
                  Failed to create conversation agent
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
