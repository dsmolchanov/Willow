import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const XI_API_KEY = Deno.env.get('XI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Retry configuration for handling API delays
const RETRY_CONFIG = {
  maxRetries: 5,         // Maximum retry attempts
  initialDelay: 2000,    // Start with 2 seconds
  maxDelay: 10000,       // Maximum 10 seconds delay
  backoffFactor: 1.5     // Increase delay by 50% each retry
}

// Interface for the simplified request
interface ConversationRequest {
  conversation_id: number;
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
    // Parse the request to get the conversation ID
    const { conversation_id } = await req.json() as ConversationRequest;
    console.log('Processing conversation:', conversation_id);

    if (!conversation_id) {
      throw new Error('No conversation ID provided');
    }

    // First, get the elevenlabs_conversation_id from the database
    const { data: conversationData, error: fetchError } = await supabase
      .from('user_conversations')
      .select('elevenlabs_conversation_id')
      .eq('conversation_id', conversation_id)
      .single();

    if (fetchError || !conversationData?.elevenlabs_conversation_id) {
      throw new Error('Could not find ElevenLabs conversation ID');
    }

    // Update status to indicate processing has started
    await supabase
      .from('user_conversations')
      .update({ status: 'fetching' })
      .eq('conversation_id', conversation_id);

    // Attempt to fetch the data from ElevenLabs with retries
    let lastError;
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

        if (response.status === 404) {
          console.log(`Data not yet available (attempt ${attempt + 1})`);
          await delay(attempt);
          continue;
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Calculate metrics from the response
        const replicsNumber = Array.isArray(data.transcript) ? data.transcript.length : 0;
        const duration = data.metadata?.call_duration_secs || 0;

        // Update the conversation with the fetched data
        const { error: updateError } = await supabase
          .from('user_conversations')
          .update({
            transcript: data.transcript,
            metadata: data.metadata,
            analysis: data.analysis,
            data_collection_results: data.analysis.data_collection_results,
            replics_number: replicsNumber,
            duration: duration,
            status: 'processed'
          })
          .eq('conversation_id', conversation_id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        return new Response(
          JSON.stringify({ 
            message: 'Conversation processed successfully',
            conversation_id
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        lastError = error;
        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          await delay(attempt);
        }
      }
    }

    // If all retries failed, update the status and throw the error
    await supabase
      .from('user_conversations')
      .update({
        status: 'fetch_failed',
        metadata: {
          error: lastError?.message,
          last_attempt: getTimestampWithTimezone()
        }
      })
      .eq('conversation_id', conversation_id);

    throw lastError;

  } catch (err) {
    console.error('Error in Edge Function:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});