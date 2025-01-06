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
    if (!user || focusedSkills.length === 0) {
      toast.error('Cannot start session', {
        description: 'Please select at least one skill to focus on.',
      });
      return;
    }
  
    setIsGeneratingScenario(true);
    setIsLoading(true);
    setProgress({ percentage: 0, message: 'Preparing to generate scenario...' });
    setIsSheetOpen(true);
  
    try {
      // Create the request payload
      const payload = {
        skill_ids: focusedSkills.map(s => s.skill_id),
        language: "ru",
        voice_id: "8M81RK3MD7u4DOJpu2G5",
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
      setScenarioData(data);
      
      toast.success('Scenario generated successfully', {
        description: 'You can now practice with the generated scenario.',
      });
  
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
      <div className="min-h-screen bg-background flex">
        <div className="flex-1">
          <SkillRoadmap 
            learningPath={learningPathData.learning_path}
            prioritizedSkills={learningPathData.prioritized_skills}
            focusedSkillIds={focusedSkills.map(s => s.skill_id)}
            onToggleFocusSkill={handleToggleFocusSkill}
          />
        </div>
        
        <DashboardRightRail 
          focusedSkills={focusedSkills}
          onRemoveSkill={(skillId) => handleToggleFocusSkill(skillId, '', '')}
          onStartSession={handleStartSession}
          isLoading={isLoading || isGeneratingScenario}
        />
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