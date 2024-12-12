import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { meditationDatabase } from '@/lib/meditationDatabase';

const WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;

export async function POST(req: Request) {
  console.log('Webhook received');
  try {
    const headersList = headers();
    const signature = headersList.get('x-elevenlabs-signature');
    console.log('Headers:', Object.fromEntries(headersList.entries()));

    // Strict signature check
    if (!WEBHOOK_SECRET || !signature) {
      console.log('Missing webhook secret or signature');
      return NextResponse.json({ 
        status: 'error',
        message: 'Missing authentication' 
      }, { status: 401 });
    }

    if (signature !== WEBHOOK_SECRET) {
      console.log('Invalid signature');
      return NextResponse.json({ 
        status: 'error',
        message: 'Invalid signature' 
      }, { status: 401 });
    }

    const data = await req.json();
    console.log('Received data:', data);
    
    // Handle ElevenLabs specific status updates
    if (data.status === 'completed') {
      // Extract meditationId and continue with existing logic
      const meditationId = data.meditation_id || data.meditationId;
      console.log('Extracted meditationId:', meditationId);
      
      if (!meditationId) {
        console.log('Missing meditation ID');
        return NextResponse.json({ 
          status: 'error',
          message: 'Missing meditation ID' 
        }, { status: 400 });
      }

      const meditation = meditationDatabase.meditationsMap[meditationId];
      console.log('Found meditation:', meditation);
      
      if (!meditation) {
        console.log('Meditation not found');
        return NextResponse.json({ 
          status: 'error',
          message: 'Meditation not found' 
        }, { status: 404 });
      }

      // Process the meditation
      console.log('Playing meditation:', meditation.title);
      
      const response = { 
        status: 'success',
        data: {
          url: meditation.url,
          title: meditation.title
        }
      };
      console.log('Sending response:', response);
      
      return NextResponse.json(response);
    }

    // Return early for non-completed status
    return NextResponse.json({ 
      status: 'success',
      message: 'Webhook received' 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Add OPTIONS handler for CORS if needed
export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-elevenlabs-signature',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
} 