import { useCallback, useEffect, useState } from 'react';
import { useClerkSupabaseClient } from './useClerkSupabaseClient';
import { useUser } from '@clerk/nextjs';
import { Database } from '@/types/supabase';

type UserScenario = Database['public']['Tables']['user_scenarios']['Row'];

interface DashboardStats {
  completedScenarios: number;
  inProgressScenarios: number;
  totalPracticeTime: number;
  averageScore: number;
  recentScenarios: UserScenario[];
  skills: {
    id: number;
    name: string;
    score: number;
    lastPracticed: string | null;
  }[];
  keyAchievements: string[];
  challengeAreas: string[];
}

export function useUserScenarios() {
  const [scenarios, setScenarios] = useState<UserScenario[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useClerkSupabaseClient();
  const { user } = useUser();

  const fetchScenarios = useCallback(async () => {
    if (!user?.id) return null;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_scenarios')
        .select('*')
        .eq('clerk_id', user.id)
        .order('start_time', { ascending: false });

      if (error) throw error;

      setScenarios(data || []);
      return data;
    } catch (err) {
      console.error('Error fetching scenarios:', err);
      setError('Failed to fetch scenario data');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user?.id]);

  const calculateDashboardStats = useCallback((data: UserScenario[]) => {
    if (!data || data.length === 0) {
      return null;
    }

    // Calculate stats
    const completedScenarios = data.filter(s => s.status === 'Completed').length;
    const inProgressScenarios = data.filter(s => s.status === 'In Progress').length;
    
    // Calculate total practice time
    const totalPracticeTime = data.reduce((total, scenario) => {
      return total + (scenario.duration_minutes || 0);
    }, 0);
    
    // Calculate average score
    const scores = data
      .filter(s => s.status === 'Completed' && s.score !== null)
      .map(s => s.score!);
    const averageScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : 0;
    
    // Get recent scenarios
    const recentScenarios = data.slice(0, 5);
    
    // Extract key achievements and challenge areas
    const keyAchievements: string[] = [];
    const challengeAreas: string[] = [];
    
    data.forEach(scenario => {
      if (scenario.practice_metrics) {
        const metrics = scenario.practice_metrics as any;
        if (Array.isArray(metrics.key_achievements)) {
          keyAchievements.push(...metrics.key_achievements);
        }
        if (Array.isArray(metrics.challenge_areas)) {
          challengeAreas.push(...metrics.challenge_areas);
        }
      }
    });

    // For skills, we would ideally join with a skills table, but for now we'll mock it
    const skills = [
      { id: 17, name: 'Active Listening', score: 4.2, lastPracticed: data[0]?.end_time },
      { id: 134, name: 'Empathy', score: 3.5, lastPracticed: data[0]?.end_time },
      { id: 150, name: 'Conflict Resolution', score: 2.8, lastPracticed: data[0]?.end_time },
      { id: 205, name: 'Clear Communication', score: 3.9, lastPracticed: data[0]?.end_time },
    ];

    return {
      completedScenarios,
      inProgressScenarios,
      totalPracticeTime,
      averageScore,
      recentScenarios,
      skills,
      keyAchievements: keyAchievements.slice(0, 5), // Limit to 5
      challengeAreas: challengeAreas.slice(0, 5)    // Limit to 5
    };
  }, []);

  const updateScenarioStatus = useCallback(async (userScenarioId: number, status: 'Completed' | 'In Progress' | 'Not Started', scoreData?: { 
    score?: number, 
    feedback?: string,
    practice_metrics?: any 
  }) => {
    if (!user?.id) return;

    try {
      const updateData: any = { status };
      
      if (status === 'Completed') {
        updateData.end_time = new Date().toISOString();
        
        if (scoreData) {
          if (scoreData.score !== undefined) updateData.score = scoreData.score;
          if (scoreData.feedback) updateData.feedback = scoreData.feedback;
          if (scoreData.practice_metrics) updateData.practice_metrics = scoreData.practice_metrics;
        }
      }

      const { error } = await supabase
        .from('user_scenarios')
        .update(updateData)
        .eq('user_scenario_id', userScenarioId);

      if (error) throw error;

      // Refresh scenarios after update
      await fetchScenarios();
    } catch (err) {
      console.error('Error updating scenario status:', err);
      setError('Failed to update scenario status');
    }
  }, [supabase, user?.id, fetchScenarios]);

  const recordNewScenario = useCallback(async (scenarioId: number, skillIds: number[], conversationId: string) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('user_scenarios')
        .insert({
          clerk_id: user.id,
          scenario_id: scenarioId,
          start_time: new Date().toISOString(),
          status: 'In Progress',
          skill_objectives: {
            type: 'lesson',
            skill_ids: skillIds,
            conversation_id: conversationId
          },
          practice_metrics: {
            success_rate: 0,
            key_achievements: [],
            challenge_areas: []
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh scenarios after adding new one
      await fetchScenarios();
      return data;
    } catch (err) {
      console.error('Error recording new scenario:', err);
      setError('Failed to record new scenario');
      return null;
    }
  }, [supabase, user?.id, fetchScenarios]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!user?.id) {
        if (mounted) {
          setScenarios([]);
          setDashboardStats(null);
        }
        return;
      }

      try {
        const data = await fetchScenarios();
        if (mounted && data) {
          const stats = calculateDashboardStats(data);
          setDashboardStats(stats);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load dashboard data');
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [user?.id, fetchScenarios, calculateDashboardStats]);

  return {
    scenarios,
    dashboardStats,
    isLoading,
    error,
    fetchScenarios,
    updateScenarioStatus,
    recordNewScenario
  };
} 