import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

serve(async (req) => {
  // This function will be called periodically
  try {
    // Fetch unprocessed invocations
    const { data, error } = await supabase
      .from('edge_function_invocations')
      .select('id, session_id')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) throw error

    for (const invocation of data) {
      // Process each invocation
      await processInvocation(invocation.session_id)

      // Mark as processed
      await supabase
        .from('edge_function_invocations')
        .update({ processed: true })
        .eq('id', invocation.id)
    }

    return new Response(JSON.stringify({ processed: data.length }), { status: 200 })
  } catch (error) {
    console.error('Error processing invocations:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

async function processInvocation(sessionId: string) {
  // Implement your logic here to send the transcript
  // This is where you'd call your external API
  console.log(`Processing session ${sessionId}`)
  
  // Example API call (replace with your actual API endpoint and logic)
  const response = await fetch('https://1d4be311-1fe3-405f-b080-e4ad882affac.mock.pstmn.io/sendTranscript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  })

  if (!response.ok) {
    throw new Error(`Failed to send transcript for session ${sessionId}`)
  }
}