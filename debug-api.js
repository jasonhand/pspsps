// A simple script to test the Petfinder API directly
require('dotenv').config();
const axios = require('axios');

async function testPetfinderAPI() {
  console.log('Testing Petfinder API connection');
  console.log('--------------------------------');
  
  // Check environment variables
  const PETFINDER_API_KEY = process.env.PETFINDER_API_KEY || 'qkMLPpXf20tzvRovgSXIGOR6FC9sbGDBSPDTon4tuQLMDFhANM';
  const PETFINDER_API_SECRET = process.env.PETFINDER_API_SECRET || 'zQL22VkF69uB4a1i4UZjGusBZbAjzHGpyUTJwkKn';
  
  console.log('API Key available:', !!PETFINDER_API_KEY);
  console.log('API Secret available:', !!PETFINDER_API_SECRET);
  
  try {
    // Get token
    console.log('\nRequesting access token...');
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', PETFINDER_API_KEY);
    formData.append('client_secret', PETFINDER_API_SECRET);
    
    const tokenResponse = await axios.post('https://api.petfinder.com/v2/oauth2/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('Token obtained successfully!');
    console.log(`Expires in: ${tokenResponse.data.expires_in} seconds`);
    const token = tokenResponse.data.access_token;
    
    // Test API call
    console.log('\nTesting API call to /v2/animals...');
    const apiResponse = await axios.get('https://api.petfinder.com/v2/animals?limit=1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('API call successful!');
    console.log(`Status: ${apiResponse.status}`);
    console.log(`Number of animals: ${apiResponse.data.animals.length}`);
    console.log(`Pagination: ${JSON.stringify(apiResponse.data.pagination)}`);
    
    // Test with the same params you're having trouble with
    console.log('\nTesting with location parameter...');
    const locationResponse = await axios.get('https://api.petfinder.com/v2/animals?location=Boulder%2C%20Colorado&limit=5', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('API call with location successful!');
    console.log(`Status: ${locationResponse.status}`);
    console.log(`Number of animals: ${locationResponse.data.animals.length}`);
    
    console.log('\nAPI TESTS PASSED - The Petfinder API is working correctly');
    console.log('If your app is still having issues, check the serverless function integration');
  } catch (error) {
    console.error('\nAPI TEST FAILED');
    console.error('Error details:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
    
    console.error('\nCheck your API credentials and internet connection');
  }
}

testPetfinderAPI();