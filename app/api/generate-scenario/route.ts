import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const response = await fetch(
      'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/generate_scenario',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'apikey': process.env.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(data)
      }
    );

    // Get the response text first
    const responseText = await response.text();
    
    // Try to parse it as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse response:', responseText);
      return NextResponse.json(
        { error: 'Invalid response from scenario generator' },
        { status: 500 }
      );
    }

    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error in generate-scenario route:', error);
    return NextResponse.json(
      { error: 'Failed to generate scenario' },
      { status: 500 }
    );
  }
}