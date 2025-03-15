// Simple script to test the edge function directly
const fetch = require('node-fetch');

// Configuration - PLEASE REPLACE THESE VALUES
const EDGE_FUNCTION_KEY = 'your-edge-function-key'; // Replace with your actual key
const CONVERSATION_ID = '125'; // Or any valid conversation ID
const EDGE_FUNCTION_URL = 'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/check-conversation';

// Test function
async function testEdgeFunction() {
  console.log('Testing edge function directly...');
  
  // Just send the conversation_id - the edge function retrieves all else from the database
  const payload = {
    conversation_id: CONVERSATION_ID
  };
  
  console.log('Sending simplified payload:', JSON.stringify(payload, null, 2));
  
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