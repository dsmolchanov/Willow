import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const XI_API_KEY = Deno.env.get('XI_API_KEY')
    
    console.log('API Key available:', !!XI_API_KEY)

    console.log('Starting to process conversations')

    const { data: conversations, error } = await supabase
      .from('user_conversations')
      .select('*')
      .or(`end_time.not.is.null,start_time.lte.${new Date(Date.now() - 300 * 1000).toISOString()}`)
      .is('analysis', null)
      .limit(10)

    if (error) {
      console.error('Error fetching conversations:', error)
      throw error
    }

    console.log(`Found ${conversations.length} conversations to process`)

    for (const conv of conversations) {
      try {
        const options = {
          method: 'GET',
          headers: {
            'xi-api-key': XI_API_KEY,
          },
        }

        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${conv.elevenlabs_conversation_id}`,
          options
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to fetch conversation ${conv.elevenlabs_conversation_id}: ${response.status} - ${errorText}`)
          continue
        }

        const data = await response.json()
        console.log(`Fetched data for conversation ${conv.elevenlabs_conversation_id}:`, data)

        if (data.status === 'done') {
          const { error: updateError } = await supabase
            .from('user_conversations')
            .update({
              status: data.analysis.call_successful,
              transcript: data.transcript,
              metadata: data.metadata,
              analysis: data.analysis,
              data_collection_results: data.analysis.data_collection_results
            })
            .eq('conversation_id', conv.conversation_id)

          if (updateError) {
            console.error(`Error updating conversation ${conv.conversation_id}:`, updateError)
          } else {
            console.log(`Successfully updated conversation ${conv.conversation_id}`)
          }
        }
      } catch (err) {
        console.error(`Error processing conversation ${conv.conversation_id}:`, err)
      }
    }

    return new Response(
      JSON.stringify({ message: 'Processed conversations' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error in Edge Function:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 