'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SkillRoadmap from '@/components/SkillRoadmap';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DashboardRightRail } from '@/components/DashboardRightRail';
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

// Helper function to safely parse JSON responses
async function parseJsonResponse(response: Response): Promise<any> {
  const responseText = await response.text();
  
  // Log the raw response for debugging
  console.log('Raw response:', responseText);
  
  if (!responseText || !responseText.trim()) {
    throw new Error('Server returned an empty response');
  }
  
  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error('JSON parsing error:', error);
    console.error('Response that failed to parse:', responseText);
    throw new Error(`Failed to parse server response: ${responseText.slice(0, 100)}...`);
  }
}

interface DashboardRightRailProps {
  focusedSkills: Array<{
    skill_id: number;
    name: string;
    priority_level: string;
  }>;
  onRemoveSkill: (skillId: number) => void;
  onStartSession: () => void;
  isLoading: boolean;
  selectedVoice: string | null;
  onVoiceChange: (voiceId: string) => void;
}

export default function SkillsPage() {
  const supabase = createClientComponentClient();
  const { user, isLoaded } = useUser();
  
  const [learningPathData, setLearningPathData] = useState<LearningPathData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedSkills, setFocusedSkills] = useState<FocusedSkill[]>([]);
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

        setLearningPathData(pathData);

        // Initialize focused skills with top 5 by score
        if (pathData?.prioritized_skills && pathData?.learning_path) {
          const topPrioritizedSkills = pathData.prioritized_skills
            .sort((a: any, b: any) => b.priority_score - a.priority_score)
            .slice(0, 5);

          const topSkills = topPrioritizedSkills
            .map((prioritySkill: any) => {
              const learningPathSkill = pathData.learning_path.find(
                (lp: any) => lp.skill_id === prioritySkill.skill_id
              );
              
              if (!learningPathSkill) return null;

              return {
                skill_id: prioritySkill.skill_id,
                name: learningPathSkill.learning_activities?.[0]?.replace('General activity for ', '') || 'Unnamed Skill',
                priority_level: learningPathSkill.priority_level || 'medium'
              };
            })
            .filter(Boolean);

          setFocusedSkills(topSkills);
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
      const isCurrentlyFocused = prevSkills.some(s => s.skill_id === skillId);

      if (isCurrentlyFocused) {
        return prevSkills.filter(s => s.skill_id !== skillId);
      }

      if (prevSkills.length >= 5) {
        toast.error('Maximum skills reached', {
          description: 'You can only focus on up to 5 skills. Please remove a skill before adding another.',
          duration: 4000,
        });
        return prevSkills;
      }

      return [...prevSkills, { skill_id: skillId, name: skillName, priority_level: priority }];
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
            learningPath={learningPathData.learning_path}
            prioritizedSkills={learningPathData.prioritized_skills}
            focusedSkillIds={focusedSkills.map(s => s.skill_id)}
            onToggleFocusSkill={handleToggleFocusSkill}
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