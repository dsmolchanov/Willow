import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { getAuth } from '@clerk/nextjs/server';

/**
 * Process Conversation API Endpoint
 * 
 * NOTE: This API is primarily for admin/recovery use. Normal conversation processing
 * should happen automatically via database triggers:
 * 
 * - update_user_traits_trigger: Extracts traits when data_collection_results is updated
 * - trigger_conversation_traits: Processes traits when analysis is updated
 * - update_skill_tracking_on_analysis: Updates skill tracking when analysis is added
 * 
 * Use this API for:
 * 1. Manual recovery of conversations that failed to process
 * 2. Admin functionality to force reprocessing of traits/skills
 * 3. Diagnostics and troubleshooting
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the user ID from Clerk
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get conversation ID from request body
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(400).json({ message: 'Missing conversationId' });
    }

    // Create Supabase client
    const supabase = createServerSupabaseClient({ req, res });

    // Track what actions were performed
    const actionsPerformed = {
      conversationFetched: false,
      traitsUpdated: false,
      skillsCalculated: false,
      scenarioCreated: false
    };

    // 1. Fetch the conversation and its analysis
    console.log(`Fetching conversation: ${conversationId} for user: ${userId}`);
    const { data: conversation, error: convError } = await supabase
      .from('user_conversations')
      .select('*')
      .eq('elevenlabs_conversation_id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('Error fetching conversation:', convError);
      return res.status(404).json({ 
        message: 'Conversation not found',
        error: convError
      });
    }

    actionsPerformed.conversationFetched = true;

    if (!conversation.analysis) {
      console.warn('No analysis data found for conversation');
      
      // Check if user already has traits we can use
      const { data: userTraits, error: traitsError } = await supabase
        .from('user_traits')
        .select('*')
        .eq('clerk_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (traitsError || !userTraits) {
        // If no traits and no analysis, return a non-error response
        // indicating processing is still pending
        return res.status(200).json({ 
          success: false,
          pending: true,
          message: 'Conversation analysis is pending, traits not available yet',
          actionsPerformed
        });
      }
      
      console.log('Found existing user traits, proceeding with skill calculations');
      // Continue with existing traits
    }

    // 2. Add data_collection_results to the conversation record if we have analysis
    // This will trigger the database update_user_traits trigger
    // which will extract and store the traits
    if (conversation.analysis) {
      console.log('Updating conversation with data_collection_results');
      
      const { error: updateError } = await supabase
        .from('user_conversations')
        .update({
          data_collection_results: conversation.analysis.trait_evaluations || {},
        })
        .eq('elevenlabs_conversation_id', conversationId);

      if (updateError) {
        console.error('Error updating conversation with data_collection_results:', updateError);
        return res.status(500).json({
          message: 'Failed to update conversation with trait data',
          error: updateError,
          actionsPerformed
        });
      }
      
      actionsPerformed.traitsUpdated = true;
    }

    // 3. Trigger the traits_skills function to calculate learning paths and skill weights
    console.log('Triggering traits_skills function');
    const traitData = conversation.analysis?.trait_evaluations || {};
    
    const { data: functionResponse, error: functionError } = await supabase.functions.invoke('traits_skills', {
      body: {
        action: 'initial_calculation',
        clerk_id: userId,
        data_collection_results: traitData
      }
    });

    if (functionError) {
      console.error('Error calling traits_skills function:', functionError);
      return res.status(500).json({ 
        message: 'Failed to calculate learning paths',
        error: functionError,
        actionsPerformed
      });
    }
    
    actionsPerformed.skillsCalculated = true;

    // 4. Create initial user_scenarios record if it doesn't exist
    console.log('Creating user_scenarios record');
    const scenarioId = conversation.scenario_info?.scenario_id || 1; // Default to 1 if not specified
    const skillIds = conversation.scenario_info?.skill_ids || [];

    // Check if a scenario record already exists
    const { data: existingScenario } = await supabase
      .from('user_scenarios')
      .select('user_scenario_id')
      .eq('clerk_id', userId)
      .eq('scenario_id', scenarioId)
      .maybeSingle();

    if (!existingScenario) {
      // Only create if it doesn't exist
      const { error: scenarioError } = await supabase
        .from('user_scenarios')
        .insert({
          clerk_id: userId,
          scenario_id: scenarioId,
          start_time: conversation.start_time,
          end_time: conversation.end_time,
          status: 'Completed',
          skill_objectives: {
            type: 'assessment',
            skill_ids: skillIds,
            conversation_id: conversationId
          },
          practice_metrics: {
            success_rate: 100,
            key_achievements: [
              "Initial assessment completed successfully",
              "Communication preferences identified",
              "Learning path established"
            ],
            challenge_areas: []
          }
        });

      if (scenarioError) {
        console.error('Error creating scenario record:', scenarioError);
        // Don't fail the whole process for this error, just log it
      } else {
        actionsPerformed.scenarioCreated = true;
      }
    } else {
      actionsPerformed.scenarioCreated = false; // Scenario already exists
    }

    // Return success with details about what was processed
    return res.status(200).json({
      success: true,
      message: 'Successfully processed conversation and triggered trait calculation',
      data: {
        functionResponse
      },
      actionsPerformed
    });
  } catch (error) {
    console.error('Error processing conversation:', error);
    return res.status(500).json({ 
      message: 'Failed to process conversation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 