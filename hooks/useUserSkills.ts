import { useCallback, useEffect, useState } from 'react';
import { useClerkSupabaseClient } from './useClerkSupabaseClient';
import { useUser } from '@clerk/nextjs';
import { Database } from '@/types/supabase';

type SkillWeight = {
  skill_id: number;
  weight_data: {
    base_weight: number;
    trait_influences: any[];
    final_weight: number;
    development_stage: {
      current: string;
      target: string;
      readiness: number;
    };
    evidence: {
      importance_factors: any[];
      learning_path: string[];
      practice_areas: string[];
    };
  };
};

type LearningPathNode = {
  skill_id: number;
  required_skills: number[];
  learning_activities: string[];
  estimated_duration: number;
  priority_level: 'critical' | 'high' | 'medium' | 'low';
};

interface SkillData {
  id: number;
  name: string;
  description: string;
  category: string;
}

interface UserSkillsData {
  skillWeights: SkillWeight[];
  learningPath: LearningPathNode[];
  topSkills: {
    skill: SkillData;
    weight: number;
    developmentStage: string;
    readiness: number;
  }[];
  suggestedActivities: {
    skillId: number;
    skillName: string;
    activities: string[];
  }[];
}

export function useUserSkills() {
  const [skillsData, setSkillsData] = useState<UserSkillsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useClerkSupabaseClient();
  const { user } = useUser();

  const fetchSkillsData = useCallback(async () => {
    if (!user?.id) return null;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch skill weights
      const { data: weightData, error: weightsError } = await supabase
        .from('user_skill_weights')
        .select('*')
        .eq('clerk_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (weightsError && weightsError.code !== 'PGRST116') {
        throw weightsError;
      }

      // Fetch learning path
      const { data: pathData, error: pathError } = await supabase
        .from('user_learning_paths')
        .select('*')
        .eq('clerk_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (pathError && pathError.code !== 'PGRST116') {
        throw pathError;
      }

      // Fetch skill metadata
      const skillIds = new Set<number>();
      
      // Add skill IDs from weights
      if (weightData?.weights) {
        for (const weight of weightData.weights) {
          skillIds.add(weight.skill_id);
        }
      }
      
      // Add skill IDs from learning path
      if (pathData?.path) {
        for (const node of pathData.path) {
          skillIds.add(node.skill_id);
        }
      }
      
      // Query for skill metadata if we have any skill IDs
      let skillsMetadata: Record<number, SkillData> = {};
      
      if (skillIds.size > 0) {
        const { data: skillsData, error: skillsError } = await supabase
          .from('skills')
          .select('*')
          .in('skill_id', Array.from(skillIds));
          
        if (skillsError) {
          throw skillsError;
        }
        
        // Create lookup map
        skillsMetadata = (skillsData || []).reduce((acc, skill) => {
          acc[skill.skill_id] = {
            id: skill.skill_id,
            name: skill.name,
            description: skill.description || '',
            category: skill.category || 'General'
          };
          return acc;
        }, {} as Record<number, SkillData>);
      }

      // Process top skills
      const topSkills = weightData?.weights 
        ? weightData.weights
          .sort((a, b) => b.weight_data.final_weight - a.weight_data.final_weight)
          .slice(0, 5)
          .map(weight => ({
            skill: skillsMetadata[weight.skill_id] || {
              id: weight.skill_id,
              name: `Skill ${weight.skill_id}`,
              description: '',
              category: 'Unknown'
            },
            weight: weight.weight_data.final_weight,
            developmentStage: weight.weight_data.development_stage.current,
            readiness: weight.weight_data.development_stage.readiness
          }))
        : [];

      // Process suggested activities
      const suggestedActivities = pathData?.path
        ? pathData.path
          .slice(0, 3)
          .map(node => ({
            skillId: node.skill_id,
            skillName: skillsMetadata[node.skill_id]?.name || `Skill ${node.skill_id}`,
            activities: node.learning_activities || []
          }))
        : [];

      // Prepare result
      const result: UserSkillsData = {
        skillWeights: weightData?.weights || [],
        learningPath: pathData?.path || [],
        topSkills,
        suggestedActivities
      };

      setSkillsData(result);
      return result;
    } catch (err) {
      console.error('Error fetching user skills data:', err);
      setError('Failed to fetch skills data');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchSkillsData();
    }
  }, [user?.id, fetchSkillsData]);

  return {
    skillsData,
    isLoading,
    error,
    fetchSkillsData
  };
} 