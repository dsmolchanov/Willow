import { useEffect, useState } from 'react';
import { useClerkSupabaseClient } from './useClerkSupabaseClient';
import { useUser } from '@clerk/nextjs';

interface UserTraits {
  user_trait_id: number;
  clerk_id: string | null;
  life_context: any;
  stakes_level: any;
  growth_motivation: any;
  confidence_pattern: any;
  interaction_style: any;
  created_at: string | null;
  updated_at: string | null;
}

export function useUserTraits() {
  const [traits, setTraits] = useState<UserTraits | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useClerkSupabaseClient();
  const { user, isLoaded: isUserLoaded } = useUser();

  useEffect(() => {
    let isMounted = true;

    async function fetchTraits() {
      if (!user?.id || !isUserLoaded) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('Fetching traits for user:', user.id);
        const { data, error } = await supabase
          .from('user_traits')
          .select('*')
          .eq('clerk_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!isMounted) return;

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('No traits found for user');
            setTraits(null);
          } else {
            console.error('Error fetching traits:', error);
            setError(error.message);
          }
        } else {
          console.log('Traits found:', data);
          setTraits(data);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error in fetchTraits:', err);
        setError('Failed to fetch user traits');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTraits();

    return () => {
      isMounted = false;
    };
  }, [user?.id, isUserLoaded, supabase]);

  const updateTraits = async (newTraits: Partial<Omit<UserTraits, 'user_trait_id' | 'clerk_id' | 'created_at' | 'updated_at'>>) => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!traits) {
        // Insert new record
        const { error } = await supabase
          .from('user_traits')
          .insert({
            clerk_id: user.id,
            ...newTraits
          });

        if (error) throw error;
      } else {
        // Update existing record
        const { error } = await supabase
          .from('user_traits')
          .update(newTraits)
          .eq('user_trait_id', traits.user_trait_id);

        if (error) throw error;
      }

      // Refetch traits
      const { data, error } = await supabase
        .from('user_traits')
        .select('*')
        .eq('clerk_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setTraits(data);
    } catch (err) {
      console.error('Error updating traits:', err);
      setError('Failed to update user traits');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    traits,
    isLoading,
    error,
    updateTraits
  };
}
