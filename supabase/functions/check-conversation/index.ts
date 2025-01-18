import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const XI_API_KEY = Deno.env.get('XI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Retry configuration for handling API delays
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 30000,    // Start with 30 seconds
  maxDelay: 30000,        // Keep consistent 30-second delay
  backoffFactor: 1        // No backoff, keep consistent delay
}

// Interface for the simplified request
interface ConversationRequest {
  conversation_id: number;
}

// Add type definitions to match the database schema
type CallStatus = 'unknown' | 'pending' | 'fetching' | 'processed' | 'fetch_failed';

interface UserConversation {
  conversation_id: number;
  clerk_id?: string;
  agent_id: string;
  elevenlabs_conversation_id?: string;
  start_time?: string;
  end_time?: string;
  status: CallStatus;
  transcript?: any[];
  metadata?: Record<string, any>;
  analysis?: Record<string, any>;
  data_collection_results?: Record<string, any>;
  duration?: number;
  replics_number?: number;
  scenario_info?: {
    scenario_id: string | null;
    title: string | null;
    skill_ids: string[];
  };
}

// Utility function for delay with exponential backoff
async function delay(attempt: number): Promise<void> {
  const backoffTime = Math.min(
    RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt),
    RETRY_CONFIG.maxDelay
  );
  await new Promise(resolve => setTimeout(resolve, backoffTime));
}

// Utility function for timezone-aware timestamps
function getTimestampWithTimezone(): string {
  const now = new Date();
  const tzOffset = -now.getTimezoneOffset();
  const hours = Math.floor(Math.abs(tzOffset) / 60);
  const minutes = Math.abs(tzOffset) % 60;
  const tzString = `${tzOffset >= 0 ? '+' : '-'}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return now.toISOString().slice(0, 19) + tzString;
}

// Main function to fetch and process conversation data
serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  try {
    const { conversation_id } = await req.json() as ConversationRequest;
    console.log('Processing conversation:', conversation_id);

    if (!conversation_id) {
      throw new Error('No conversation ID provided');
    }

    // Get the conversation data and update initial status
    const { data: conversationData, error: fetchError } = await supabase
      .from('user_conversations')
      .select('elevenlabs_conversation_id, status')
      .eq('conversation_id', conversation_id)
      .single();

    if (fetchError) {
      throw new Error(`Database fetch error: ${fetchError.message}`);
    }

    if (!conversationData?.elevenlabs_conversation_id) {
      throw new Error('ElevenLabs conversation ID not found');
    }

    // If status is already 'processed', return early
    if (conversationData.status === 'processed') {
      return new Response(
        JSON.stringify({ 
          message: 'Conversation already processed',
          conversation_id
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update status to fetching if not already
    if (conversationData.status !== 'fetching') {
      await supabase
        .from('user_conversations')
        .update({ 
          status: 'fetching',
          metadata: {
            ...conversationData.metadata,
            fetch_attempts: 0,
            last_attempt: getTimestampWithTimezone()
          }
        })
        .eq('conversation_id', conversation_id);
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt + 1} to fetch conversation data`);
        
        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${conversationData.elevenlabs_conversation_id}`,
          {
            method: 'GET',
            headers: { 'xi-api-key': XI_API_KEY }
          }
        );

        const responseText = await response.text();
        console.log(`ElevenLabs API Response (Attempt ${attempt + 1}):`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText
        });

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.log('Failed to parse response as JSON:', e);
        }

        if (response.status === 404) {
          console.log(`Data not yet available (attempt ${attempt + 1}). Will retry in ${RETRY_CONFIG.initialDelay/1000} seconds`);
          
          // Update metadata with attempt information
          await supabase
            .from('user_conversations')
            .update({
              metadata: {
                ...conversationData.metadata,
                fetch_attempts: attempt + 1,
                last_attempt: getTimestampWithTimezone(),
                last_response: {
                  status: response.status,
                  body: responseText,
                  timestamp: new Date().toISOString()
                }
              }
            })
            .eq('conversation_id', conversation_id);

          await delay(attempt);
          continue;
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status} - ${responseText}`);
        }

        const data = responseData;
        console.log('Validating response data structure:', {
          hasTranscript: Array.isArray(data.transcript),
          hasAnalysis: typeof data.analysis === 'object',
          hasMetadata: typeof data.metadata === 'object'
        });

        // Validate required data structure
        if (!Array.isArray(data.transcript)) {
          throw new Error('Invalid response: transcript must be an array');
        }
        if (!data.analysis || typeof data.analysis !== 'object') {
          throw new Error('Invalid response: analysis must be an object');
        }
        if (!data.metadata || typeof data.metadata !== 'object') {
          throw new Error('Invalid response: metadata must be an object');
        }

        // Prepare update data with strict typing
        const updateData: Partial<UserConversation> = {
          transcript: data.transcript,
          metadata: {
            ...data.metadata,
            fetch_attempts: attempt + 1,
            last_successful_fetch: getTimestampWithTimezone(),
            api_response_history: [
              ...(conversationData.metadata?.api_response_history || []),
              {
                attempt: attempt + 1,
                timestamp: new Date().toISOString(),
                status: response.status,
                success: true
              }
            ]
          },
          analysis: data.analysis,
          data_collection_results: data.analysis.data_collection_results || {},
          replics_number: data.transcript.length,
          duration: data.metadata?.call_duration_secs || 0,
          status: 'processed' as CallStatus
        };

        console.log('Update payload validation:', {
          conversation_id,
          payloadSize: JSON.stringify(updateData).length,
          hasRequiredFields: {
            transcript: !!updateData.transcript,
            analysis: !!updateData.analysis,
            status: updateData.status === 'processed'
          }
        });

        // Attempt the update with detailed error handling
        const { data: updatedData, error: updateError } = await supabase
          .from('user_conversations')
          .update(updateData)
          .eq('conversation_id', conversation_id)
          .select()
          .single();

        if (updateError) {
          console.error('Database update failed:', {
            error: updateError,
            errorCode: updateError.code,
            errorMessage: updateError.message,
            errorDetails: updateError.details,
            conversation_id,
            updatePayload: updateData
          });
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        console.log('Database update successful:', {
          conversation_id,
          newStatus: updatedData?.status,
          updateTime: new Date().toISOString()
        });

        return new Response(
          JSON.stringify({ 
            message: 'Conversation processed successfully',
            conversation_id,
            attempts: attempt + 1,
            processingTime: {
              attempts: attempt + 1,
              totalSeconds: (attempt + 1) * RETRY_CONFIG.initialDelay / 1000
            }
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Attempt ${attempt + 1} failed:`, {
          error: lastError.message,
          stack: lastError.stack,
          conversation_id,
          timestamp: new Date().toISOString()
        });
        
        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          await delay(attempt);
        }
      }
    }

    // Update status to pending if all retries failed
    const { error: finalStatusError } = await supabase
      .from('user_conversations')
      .update({
        status: 'pending' as CallStatus,
        metadata: {
          ...conversationData.metadata,
          fetch_attempts: RETRY_CONFIG.maxRetries,
          last_attempt: getTimestampWithTimezone(),
          error: lastError?.message || 'Data not yet available'
        }
      })
      .eq('conversation_id', conversation_id);

    if (finalStatusError) {
      console.error('Failed to update final status:', finalStatusError);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Conversation processing pending, please retry later',
        conversation_id,
        attempts: RETRY_CONFIG.maxRetries
      }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error in Edge Function:', {
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});