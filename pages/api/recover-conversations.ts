import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Get the user ID from Clerk
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Initialize Supabase client with the user's session
  const supabase = createServerSupabaseClient({ req, res });

  // Find conversations without traits for this user
  const { data: conversations, error: fetchError } = await supabase
    .from('user_conversations')
    .select('conversation_id, elevenlabs_conversation_id, scenario_info')
    .eq('clerk_id', userId)
    .is('analysis', 'null')
    .order('start_time', { ascending: false });

  if (fetchError) {
    console.error('Error fetching conversations:', fetchError);
    return res.status(500).json({ 
      message: 'Failed to fetch conversations',
      error: fetchError 
    });
  }

  if (!conversations || conversations.length === 0) {
    return res.status(200).json({ 
      message: 'No conversations found that need recovery',
      recoveredCount: 0 
    });
  }

  // Process each conversation
  const results = await Promise.all(
    conversations.map(async (conversation) => {
      try {
        // Get the agent ID from the scenario info
        const agentId = conversation.scenario_info?.agent_id;
        if (!agentId) {
          return { 
            conversationId: conversation.conversation_id,
            status: 'skipped', 
            reason: 'Missing agent ID' 
          };
        }

        // Call the ElevenLabs analyze API through the edge function
        const { data: analysisResponse, error: analysisError } = await supabase.functions.invoke(
          'analyze_conversation',
          {
            body: {
              conversation_id: conversation.elevenlabs_conversation_id,
              agent_id: agentId
            }
          }
        );

        if (analysisError) {
          return { 
            conversationId: conversation.conversation_id,
            status: 'failed', 
            reason: analysisError 
          };
        }

        // Update the conversation with the analysis
        const { error: updateError } = await supabase
          .from('user_conversations')
          .update({
            analysis: analysisResponse.analysis || {}
          })
          .eq('conversation_id', conversation.conversation_id);

        if (updateError) {
          return { 
            conversationId: conversation.conversation_id,
            status: 'failed', 
            reason: updateError 
          };
        }

        // Return success
        return { 
          conversationId: conversation.conversation_id,
          status: 'success' 
        };
      } catch (error) {
        console.error(`Error processing conversation ${conversation.conversation_id}:`, error);
        return { 
          conversationId: conversation.conversation_id,
          status: 'error', 
          reason: error 
        };
      }
    })
  );

  // Return the results
  return res.status(200).json({
    message: 'Recovery process completed',
    recoveredCount: results.filter(r => r.status === 'success').length,
    results
  });
} 