import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface ElevenLabsResponse {
  status: string;
  transcript: any;
  metadata: any;
  analysis: {
    call_successful: boolean;
    data_collection_results: any;
  };
}

interface ConversationRequest {
  conversation_id: number;
  clerk_id: string;
  agent_id: string;
  elevenlabs_conversation_id: string;
  end_time: string;
  status: string;
}

function countReplies(transcript: any): number {
  if (!transcript || !Array.isArray(transcript)) return 0;
  return transcript.length;
}

async function fetchElevenLabsData(conversationId: string): Promise<ElevenLabsResponse> {
  const options = {
    method: 'GET',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
    },
  };

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
    options
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch conversation: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Parse the request body
    const conversation: ConversationRequest = await req.json();
    console.log('Processing conversation:', conversation);

    if (!conversation.elevenlabs_conversation_id) {
      throw new Error('No ElevenLabs conversation ID provided');
    }

    // Fetch data from ElevenLabs
    const data = await fetchElevenLabsData(conversation.elevenlabs_conversation_id);
    console.log('ElevenLabs response:', data);

    if (data.status !== 'done') {
      console.log(`Conversation ${conversation.elevenlabs_conversation_id} not ready, status: ${data.status}`);
      return new Response(
        JSON.stringify({ message: 'Conversation not ready' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate metrics
    const replicsNumber = countReplies(data.transcript);

    // Update the conversation record
    const { error: updateError } = await supabase
      .from('user_conversations')
      .update({
        transcript: data.transcript,
        metadata: data.metadata,
        analysis: data.analysis,
        data_collection_results: data.analysis.data_collection_results,
        replics_number: replicsNumber
      })
      .eq('conversation_id', conversation.conversation_id);

    if (updateError) {
      console.error('Error updating conversation:', updateError);
      throw updateError;
    }

    console.log(`Successfully processed conversation ${conversation.conversation_id}`);
    return new Response(
      JSON.stringify({ 
        message: 'Conversation processed successfully',
        conversation_id: conversation.conversation_id 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error in Edge Function:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}); 