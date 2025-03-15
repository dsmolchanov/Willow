import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { getAuth, clerkClient } from '@clerk/nextjs/server';

/**
 * Ensure User Exists API Endpoint
 * 
 * This API checks if a user record exists in the Supabase users table
 * and creates it if not. It uses the Clerk user data to populate the record.
 * 
 * It should be called when you suspect there may be a race condition with
 * the user record not being created yet, but you need to reference it via
 * foreign key in another table.
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

    // Create Supabase client
    const supabase = createServerSupabaseClient({ req, res });

    // Get the Clerk user data
    const clerkUser = await clerkClient.users.getUser(userId);

    // First, check if the user exists in the Supabase users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('clerk_id')
      .eq('clerk_id', userId)
      .maybeSingle();
      
    if (userCheckError && userCheckError.code !== 'PGRST116') { // Not found error
      console.error('Error checking if user exists:', userCheckError);
      return res.status(500).json({ 
        message: 'Error checking if user exists',
        error: userCheckError
      });
    }
    
    // If user already exists, just return success
    if (existingUser) {
      return res.status(200).json({
        success: true,
        message: 'User already exists',
        created: false,
        userId
      });
    }
    
    // User doesn't exist yet, let's wait a moment for the Clerk webhook
    console.log(`User ${userId} not found, waiting briefly for Clerk webhook...`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    // Check again
    const { data: recheck, error: recheckError } = await supabase
      .from('users')
      .select('clerk_id')
      .eq('clerk_id', userId)
      .maybeSingle();
      
    if (recheck) {
      console.log('User was created by Clerk webhook during wait');
      return res.status(200).json({
        success: true,
        message: 'User was created by Clerk webhook',
        created: false,
        userId
      });
    }
    
    // User still doesn't exist, create it
    console.log(`Creating new user record for Clerk ID: ${userId}`);
    
    const userRecord = {
      clerk_id: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      image_url: clerkUser.imageUrl || ''
    };
    
    console.log('Inserting user record:', userRecord);
    
    const { error: createUserError } = await supabase
      .from('users')
      .insert(userRecord);
      
    if (createUserError) {
      // If it's a unique violation, user was created by another process
      if (createUserError.code === '23505') { // PostgreSQL unique violation code
        return res.status(200).json({
          success: true,
          message: 'User was created by another process',
          created: false,
          userId
        });
      }
      
      // Otherwise it's a real error
      console.error('Error creating user:', createUserError);
      return res.status(500).json({ 
        message: 'Error creating user',
        error: createUserError
      });
    }
    
    // Success
    return res.status(200).json({
      success: true,
      message: 'User created successfully',
      created: true,
      userId
    });
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    return res.status(500).json({ 
      message: 'Error ensuring user exists',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 