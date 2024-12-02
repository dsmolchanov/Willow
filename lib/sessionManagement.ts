// lib/sessionManagement.ts
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
  is_active?: boolean;
}

export interface SessionData {
  clerk_id: string;
  knowledgebase_id: string;
  avatar_id: string;
  language: string;
  type: string;
}

export async function startSession(
  supabase: SupabaseClient, 
  sessionData: SessionData
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        ...sessionData,
        started_at: new Date().toISOString(),
        is_active: true,
        last_activity: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error in startSession:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('No data returned from insert operation');
    }

    return data.id;
  } catch (error) {
    console.error('Error starting session:', error);
    throw error;
  }
}

export async function updateSessionActivity(
  supabase: SupabaseClient, 
  sessionId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('sessions')
      .update({ 
        last_activity: new Date().toISOString() 
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error in updateSessionActivity:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating session activity:', error);
    throw error;
  }
}

export async function endSession(
  supabase: SupabaseClient, 
  sessionId: string, 
  transcript: string,
  userId?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('sessions')
      .update({ 
        ended_at: new Date().toISOString(),
        transcript: transcript,
        is_active: false,
        user_id: userId || 'Anonymous'
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error in endSession:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error ending session:', error);
    throw error;
  }
}