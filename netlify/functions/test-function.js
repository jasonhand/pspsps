// This is a simple test script to verify the function works
require('dotenv').config({ path: '../../.env' });
const proxy = require('./petfinder-proxy');

async function test() {
  const mockEvent = {
    path: '/.netlify/functions/petfinder-proxy/animals',
    httpMethod: 'GET',
    queryStringParameters: {
      location: 'Boulder, Colorado',
      limit: '50',
      type: 'cat',
      distance: '50'
    }
  };

  console.log('Testing with mock event:', mockEvent);
  
  try {
    const result = await proxy.handler(mockEvent);
    console.log('Function response status:', result.statusCode);
    console.log('Response body length:', result.body.length);
    // Don't log the entire body to avoid console clutter
    console.log('Success!');
  } catch (error) {
    console.error('Error testing function:', error);
  }
}

test();