// Simple script to test the edge function directly
const fetch = require('node-fetch');

// Configuration - PLEASE REPLACE THESE VALUES
const EDGE_FUNCTION_KEY = 'your-edge-function-key'; // Replace with your actual key
const CONVERSATION_ID = '125'; // Or any valid conversation ID
const ELEVENLABS_CONVERSATION_ID = 'IIUXA5a8vutceVCaLCXU'; // Or any valid ElevenLabs ID
const CLERK_ID = 'user_2uDyvZzSsALKUujz2oHnQEOvAuJ'; // Or any valid clerk ID
const AGENT_ID = 'some-agent-id'; // Add your agent ID here
const EDGE_FUNCTION_URL = 'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/check-conversation';

// Test function
async function testEdgeFunction() {
  console.log('Testing edge function directly...');
  
  // Create a timestamp for end_time (current time)
  const now = new Date();
  const end_time = now.toISOString().replace('T', ' ').substring(0, 19);
  
  // Create the complete payload with all required parameters
  const payload = {
    conversation_id: CONVERSATION_ID,
    elevenlabs_conversation_id: ELEVENLABS_CONVERSATION_ID,
    clerk_id: CLERK_ID,
    agent_id: AGENT_ID,
    end_time: end_time,
    status: 'success'
  };
  
  console.log('Sending payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    const status = response.status;
    let data;
    
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }
    
    console.log('Response status:', status);
    console.log('Response data:', typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    
    return { status, data };
  } catch (error) {
    console.error('Error calling edge function:', error);
    return { error: error.message };
  }
}

// Run the test
testEdgeFunction()
  .then(result => {
    console.log('Test completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 