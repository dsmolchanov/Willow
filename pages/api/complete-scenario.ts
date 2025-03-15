import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { processCompletedScenario } from '@/services/scenarioService';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(400).json({ message: 'Missing conversationId' });
    }

    // Create Supabase client
    const supabase = createServerSupabaseClient({ req, res });

    // Process the scenario
    const result = await processCompletedScenario(
      supabase,
      userId,
      conversationId
    );

    if (!result) {
      return res.status(404).json({ message: 'Failed to process scenario or scenario not found' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Scenario processed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error completing scenario:', error);
    return res.status(500).json({ 
      message: 'Failed to complete scenario',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 