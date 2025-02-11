'use client';

import SkillRoadmap from '@/components/SkillRoadmap';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DashboardRightRail } from '@/components/DashboardRightRail';
import { useSupabase } from '@/context/SupabaseContext';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";

interface FocusedSkill {
  skill_id: number;
  name: string;
  priority_level: string;
}

interface LearningPathData {
  learning_path: any[];
  prioritized_skills: any[];
}

interface GenerationProgress {
  percentage: number;
  message: string;
}

export default function SkillsPage() {
  const { user } = useUser();
  const supabase = useSupabase();
  
  const [learningPathData, setLearningPathData] = useState<LearningPathData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedSkills, setFocusedSkills] = useState<FocusedSkill[]>([]);
  const [skillTranslations, setSkillTranslations] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [scenarioData, setScenarioData] = useState<any>(null);
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    percentage: 0,
    message: ''
  });
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadLearningPathData = async () => {
      try {
        // First get learning path data
        const { data: pathData, error: pathError } = await supabase
          .from('user_learning_paths')
          .select('learning_path, prioritized_skills')
          .eq('clerk_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (pathError) {
          const errorMessage = pathError.message === 'No rows found'
            ? 'No skill data available yet. Complete a conversation to generate your skill roadmap.'
            : 'Error loading skills data. Please try again later.';
          setError(errorMessage);
          return;
        }

        // Get all skill IDs from both learning path and prioritized skills
        const skillIds = [
          ...(pathData?.learning_path?.map((lp: any) => lp.skill_id) || []),
          ...(pathData?.prioritized_skills?.map((ps: any) => ps.skill_id) || [])
        ];

        if (skillIds.length > 0) {
          // Fetch both translations and active status
          const [translationsResponse, skillsResponse] = await Promise.all([
            supabase
              .from('skill_translations')
              .select('skill_id, name')
              .in('skill_id', skillIds)
              .eq('language', 'ru'),
            supabase
              .from('skills')
              .select('skill_id, is_active')
              .in('skill_id', skillIds)
          ]);

          if (translationsResponse.error) {
            console.error('Error fetching skill translations:', translationsResponse.error);
            setError('Error loading skill names. Please try again later.');
            return;
          }

          if (skillsResponse.error) {
            console.error('Error fetching skills:', skillsResponse.error);
            setError('Error loading skill data. Please try again later.');
            return;
          }

          // Create maps for translations and active status
          const skillNames = new Map(translationsResponse.data?.map(t => [t.skill_id, t.name]));
          const activeStatus = new Map(skillsResponse.data?.map(s => [s.skill_id, s.is_active]));

          setSkillTranslations(skillNames);

          // Update learning path and prioritized skills with active status
          const updatedPathData = {
            learning_path: pathData.learning_path.map((skill: any) => ({
              ...skill,
              is_active: activeStatus.get(skill.skill_id)
            })),
            prioritized_skills: pathData.prioritized_skills.map((skill: any) => ({
              ...skill,
              is_active: activeStatus.get(skill.skill_id)
            }))
          };

          setLearningPathData(updatedPathData);

          // Update focused skills to only include active skills
          if (updatedPathData.prioritized_skills && updatedPathData.learning_path) {
            const topPrioritizedSkills = Array.from(
              new Map(
                updatedPathData.prioritized_skills
                  .filter((skill: any) => activeStatus.get(skill.skill_id) !== false)
                  .sort((a: any, b: any) => b.priority_score - a.priority_score)
                  .map((skill: any) => [skill.skill_id, skill])
              ).values()
            ).slice(0, 5);

            const topSkills = topPrioritizedSkills
              .map((prioritySkill: any) => {
                const learningPathSkill = updatedPathData.learning_path.find(
                  (lp: any) => lp.skill_id === prioritySkill.skill_id
                );
                
                if (!learningPathSkill) return null;

                const skillName = skillNames.get(prioritySkill.skill_id);
                if (!skillName) return null;

                return {
                  skill_id: prioritySkill.skill_id,
                  name: skillName,
                  priority_level: learningPathSkill.priority_level || 'medium'
                } as FocusedSkill;
              })
              .filter((skill): skill is FocusedSkill => skill !== null);

            const uniqueTopSkills = Array.from(
              new Map(topSkills.map(skill => [skill.skill_id, skill])).values()
            );

            setFocusedSkills(uniqueTopSkills);
          }
        }
      } catch (err) {
        console.error('Error in loadLearningPathData:', err);
        setError('An unexpected error occurred while loading your skills data.');
      }
    };

    loadLearningPathData();
  }, [user, supabase]);

  const handleToggleFocusSkill = (skillId: number, skillName: string, priority: string) => {
    setFocusedSkills(prevSkills => {
        // Check if skill is already focused
        const isCurrentlyFocused = prevSkills.some(s => s.skill_id === skillId);

        if (isCurrentlyFocused) {
            // Remove the skill if it's already focused
            return prevSkills.filter(s => s.skill_id !== skillId);
        }

        // Check maximum limit
        if (prevSkills.length >= 5) {
            toast.error('Maximum skills reached', {
                description: 'You can only focus on up to 5 skills. Please remove a skill before adding another.',
                duration: 4000,
            });
            return prevSkills;
        }

        // Get the translated name from our translations map
        const translatedName = skillTranslations.get(skillId) || skillName;

        // Add the new skill
        return [...prevSkills, { 
            skill_id: skillId, 
            name: translatedName, 
            priority_level: priority 
        }];
    });
  };

  const handleStartSession = async () => {
    if (!user || focusedSkills.length === 0 || !selectedVoice) {
      toast.error('Cannot start session', {
        description: 'Please select at least one skill and a voice to focus on.',
      });
      return;
    }
  
    setIsGeneratingScenario(true);
    setIsLoading(true);
    setProgress({ percentage: 0, message: 'Preparing to generate scenario...' });
    setIsSheetOpen(true);
  
    try {
      const payload = {
        skill_ids: focusedSkills.map(s => s.skill_id),
        language: "ru",
        voice_id: selectedVoice,
        clerk_id: user.id
      };
  
      // Use your Next.js API route instead of calling Supabase directly
      const response = await fetch('/api/generate-scenario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate scenario');
      }
  
      const data = await response.json();
      setProgress({ percentage: 100, message: 'Scenario generated successfully!' });
      
      // Close the sheet
      setIsSheetOpen(false);
      
      // Redirect to lessons page with the new scenario
      if (data.scenario_id) {
        window.location.href = `/dashboard/lessons?scenario=${data.scenario_id}&tab=practice`;
      } else {
        throw new Error('No scenario ID in response');
      }
      
    } catch (error) {
      console.error('Scenario generation error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
  
      setIsSheetOpen(false);
      
      toast.error('Failed to generate scenario', {
        description: error instanceof Error 
          ? `Error: ${error.message}. Please try again.`
          : 'An unexpected error occurred. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsGeneratingScenario(false);
      setIsLoading(false);
    }
  };

  if (!learningPathData?.learning_path || !learningPathData?.prioritized_skills) {
    return (
      <div className="p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No skill data available yet. Complete a conversation to generate your skill roadmap.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="flex">
        <div className="flex-1 overflow-y-auto pr-4 max-h-[calc(100vh-2rem)]">
          <SkillRoadmap 
            learningPath={learningPathData?.learning_path}
            prioritizedSkills={learningPathData?.prioritized_skills}
            focusedSkillIds={focusedSkills.map(s => s.skill_id)}
            onToggleFocusSkill={handleToggleFocusSkill}
            skillTranslations={skillTranslations}
          />
        </div>
        
        <div className="w-80 flex-shrink-0">
          <div className="fixed w-80">
            <DashboardRightRail 
              focusedSkills={focusedSkills}
              onRemoveSkill={(skillId) => handleToggleFocusSkill(skillId, '', '')}
              onStartSession={handleStartSession}
              isLoading={isGeneratingScenario}
              selectedVoice={selectedVoice}
              onVoiceChange={setSelectedVoice}
            />
          </div>
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Generated Scenario</SheetTitle>
            <SheetDescription>
              Practice the following scenario to improve your skills
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {isGeneratingScenario ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <Spinner className="w-5 h-5" />
                  <span>{progress.message || 'Generating your scenario...'}</span>
                </div>
                {progress.percentage > 0 && (
                  <Progress value={progress.percentage} className="w-full" />
                )}
              </div>
            ) : scenarioData ? (
              <div className="space-y-4">
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">
                  {JSON.stringify(scenarioData, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
} 