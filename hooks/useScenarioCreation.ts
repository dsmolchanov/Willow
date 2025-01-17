import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type ScenarioStatus = 'idle' | 'creating' | 'pending' | 'processing' | 'completed' | 'failed';

interface UseScenarioCreationProps {
  onSuccess?: (scenarioId: number) => void;
  onError?: (error: Error) => void;
}

export function useScenarioCreation({ onSuccess, onError }: UseScenarioCreationProps = {}) {
  const [status, setStatus] = useState<ScenarioStatus>('idle');
  const [scenarioId, setScenarioId] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Set up subscription when scenarioId is available
  useEffect(() => {
    if (!scenarioId) return;

    // First, fetch the current status
    const fetchCurrentStatus = async () => {
      const { data, error } = await supabase
        .from('scenarios')
        .select('agent_status, agent_id')
        .eq('scenario_id', scenarioId)
        .single();

      if (error) {
        console.error('Error fetching scenario status:', error);
        return;
      }

      if (data) {
        // Only update status if it's a valid transition
        if (data.agent_status !== status) {
          setStatus(data.agent_status as ScenarioStatus);
        }
        
        // Only redirect if we have both completed status and agent_id
        if (data.agent_status === 'completed' && data.agent_id) {
          // Add a small delay to ensure UI updates are complete
          setTimeout(() => {
            onSuccess?.(scenarioId);
            router.push(`/dashboard/lessons?tab=practice&scenario=${scenarioId}`);
          }, 1000);
        }
      }
    };

    fetchCurrentStatus();

    // Subscribe to changes in the scenario's agent_status
    const channel = supabase
      .channel(`scenario_${scenarioId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scenarios',
          filter: `scenario_id=eq.${scenarioId}`
        },
        async (payload) => {
          const newStatus = payload.new.agent_status;
          
          // Only update status if it's different
          if (newStatus !== status) {
            setStatus(newStatus as ScenarioStatus);
          }

          if (newStatus === 'completed') {
            // Double-check the agent_id is available and scenario is truly ready
            const { data, error } = await supabase
              .from('scenarios')
              .select('agent_id, agent_status')
              .eq('scenario_id', scenarioId)
              .single();

            if (!error && data?.agent_id && data.agent_status === 'completed') {
              // Add a small delay to ensure UI updates are complete
              setTimeout(() => {
                onSuccess?.(scenarioId);
                router.push(`/dashboard/lessons?tab=practice&scenario=${scenarioId}`);
              }, 1000);
            }
          } else if (newStatus === 'failed') {
            const error = new Error(payload.new.error_details?.error || 'Failed to create agent');
            setError(error);
            onError?.(error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scenarioId, supabase, router, onSuccess, onError, status]);

  const createScenario = async (skillIds: number[], language: string = 'en', voiceId: string | null = null) => {
    try {
      setStatus('creating');
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('No authenticated user');
      }

      // Call the generate_scenario edge function
      const { data, error } = await supabase.functions.invoke('generate_scenario', {
        body: {
          skill_ids: skillIds,
          language,
          voice_id: voiceId,
          clerk_id: session.user.id
        }
      });

      if (error) throw error;

      setScenarioId(data.scenario_id);
      // Only update status if it's different from current
      if (data.agent_status !== status) {
        setStatus(data.agent_status);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create scenario');
      setError(error);
      setStatus('failed');
      onError?.(error);
    }
  };

  return {
    createScenario,
    status,
    scenarioId,
    error,
    isLoading: ['creating', 'pending', 'processing'].includes(status)
  };
} 