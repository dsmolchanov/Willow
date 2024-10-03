import { SupabaseClient } from '@supabase/supabase-js';

export interface Session {
  id: string;
  clerk_id: string;
  knowledgebase_id: string;
  avatar_id: string;
  language: string;
  type: string;
  started_at: string;
  last_activity?: string;
  ended_at?: string;
  transcript?: string;
}

export async function startSession(supabase: SupabaseClient, sessionData: any) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error starting session:', error);
    throw error;
  }
}

export async function updateSessionActivity(supabase: SupabaseClient, sessionId: string) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating session activity:', error);
    throw error;
  }
}

export async function endSession(supabase: SupabaseClient, sessionId: string, transcript: string) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .update({ 
        ended_at: new Date().toISOString(),
        transcript: transcript,
        is_active: false  // Set is_active to false
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error ending session:', error);
    throw error;
  }
}