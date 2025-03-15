import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { getAuth } from '@clerk/nextjs/server';

/**
 * Update User Traits API Endpoint
 * 
 * This API directly invokes the traits_skills function to calculate user skills and learning paths.
 * It can be used when the normal database triggers aren't working or for admin/recovery purposes.
 * 
 * It will:
 * 1. Look for existing user traits
 * 2. If traits exist, use them to calculate skills/learning paths
 * 3. If no traits exist, use default/placeholder traits
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

    // Optional override traits in the request body
    const { traits: overrideTrait } = req.body;

    // Create Supabase client
    const supabase = createServerSupabaseClient({ req, res });

    // Track actions
    const actionsPerformed = {
      userFound: true,
      existingTraitsFound: false,
      traitsSkillsInvoked: false,
      successfulUpdate: false
    };

    // 1. Check if user already has traits
    const { data: existingTraits, error: traitsError } = await supabase
      .from('user_traits')
      .select('*')
      .eq('clerk_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Use either existing traits, provided override, or default traits
    let traitData;
    
    if (overrideTrait) {
      // If override traits were provided in the request
      traitData = overrideTrait;
      console.log('Using override traits from request');
    } else if (!traitsError && existingTraits) {
      // If existing traits were found
      actionsPerformed.existingTraitsFound = true;
      
      // Convert from user_traits format to data_collection_results format
      traitData = {
        life_context: {
          value: existingTraits.life_context.value,
          rationale: existingTraits.life_context.rationale
        },
        stakes_level: {
          value: existingTraits.stakes_level.value, 
          rationale: existingTraits.stakes_level.rationale
        },
        growth_motivation: {
          value: existingTraits.growth_motivation.value,
          rationale: existingTraits.growth_motivation.rationale
        },
        confidence_pattern: {
          value: existingTraits.confidence_pattern.value,
          rationale: existingTraits.confidence_pattern.rationale
        },
        interaction_style: {
          value: existingTraits.interaction_style.value,
          rationale: existingTraits.interaction_style.rationale
        }
      };
      
      console.log('Using existing traits for user', userId);
    } else {
      // Use default traits if no existing traits or override
      console.log('No existing traits found, using defaults');
      traitData = {
        life_context: {
          value: "professional_growth",
          rationale: "User is focused on professional development"
        },
        stakes_level: {
          value: "medium",
          rationale: "The stakes are moderate for the user"
        },
        growth_motivation: {
          value: "purpose_driven",
          rationale: "User shows signs of purpose-driven motivation"
        },
        confidence_pattern: {
          value: "growth_mindset",
          rationale: "User demonstrates a growth mindset"
        },
        interaction_style: {
          value: "collaborative",
          rationale: "User shows a preference for collaborative interactions"
        }
      };
    }

    // 2. Call traits_skills function to calculate learning paths and skill weights
    console.log('Invoking traits_skills function directly');
    actionsPerformed.traitsSkillsInvoked = true;
    
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
        message: 'Failed to update traits and calculate learning paths',
        error: functionError,
        actionsPerformed
      });
    }
    
    actionsPerformed.successfulUpdate = true;

    // Return success
    return res.status(200).json({
      success: true,
      message: 'Successfully updated user traits and calculated learning paths',
      data: {
        functionResponse
      },
      actionsPerformed
    });
  } catch (error) {
    console.error('Error updating user traits:', error);
    return res.status(500).json({ 
      message: 'Failed to update user traits',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 