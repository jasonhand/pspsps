// This script tests the serverless function directly
const proxyFunction = require('./netlify/functions/petfinder-proxy');

async function testServerlessFunction() {
  console.log('Testing Netlify serverless function');
  console.log('---------------------------------');
  
  try {
    // Test case 1: Basic animals endpoint
    const mockEvent1 = {
      path: '/.netlify/functions/petfinder-proxy/animals',
      httpMethod: 'GET',
      queryStringParameters: {
        limit: '1'
      }
    };
    
    console.log('\nTest Case 1: Basic animals endpoint');
    console.log('Mock event:', JSON.stringify(mockEvent1, null, 2));
    
    const result1 = await proxyFunction.handler(mockEvent1);
    console.log(`Status: ${result1.statusCode}`);
    
    if (result1.statusCode === 200) {
      const data = JSON.parse(result1.body);
      console.log(`Success! Found ${data.animals.length} animals`);
    } else {
      console.error('Test case 1 failed');
      console.error('Response:', result1.body);
    }
    
    // Test case 2: With location parameter
    const mockEvent2 = {
      path: '/.netlify/functions/petfinder-proxy/animals',
      httpMethod: 'GET',
      queryStringParameters: {
        location: 'Boulder, Colorado',
        limit: '1'
      }
    };
    
    console.log('\nTest Case 2: With location parameter');
    console.log('Mock event:', JSON.stringify(mockEvent2, null, 2));
    
    const result2 = await proxyFunction.handler(mockEvent2);
    console.log(`Status: ${result2.statusCode}`);
    
    if (result2.statusCode === 200) {
      const data = JSON.parse(result2.body);
      console.log(`Success! Found ${data.animals.length} animals near Boulder`);
    } else {
      console.error('Test case 2 failed');
      console.error('Response:', result2.body);
    }
    
    // Test case 3: With v2 in the path
    const mockEvent3 = {
      path: '/.netlify/functions/petfinder-proxy/v2/animals',
      httpMethod: 'GET',
      queryStringParameters: {
        limit: '1'
      }
    };
    
    console.log('\nTest Case 3: With v2 in the path');
    console.log('Mock event:', JSON.stringify(mockEvent3, null, 2));
    
    const result3 = await proxyFunction.handler(mockEvent3);
    console.log(`Status: ${result3.statusCode}`);
    
    if (result3.statusCode === 200) {
      const data = JSON.parse(result3.body);
      console.log(`Success! Found ${data.animals.length} animals (with v2 in path)`);
    } else {
      console.error('Test case 3 failed');
      console.error('Response:', result3.body);
    }
    
  } catch (error) {
    console.error('Error testing serverless function:', error);
  }
}

testServerlessFunction();