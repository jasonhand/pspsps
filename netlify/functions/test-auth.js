require('dotenv').config({ path: '../../.env' });
const axios = require('axios');

async function testAuth() {
  // Try to get from env first
  let PETFINDER_API_KEY = process.env.PETFINDER_API_KEY;
  let PETFINDER_API_SECRET = process.env.PETFINDER_API_SECRET;
  
  // Fallback for development if environment variables aren't loading
  if (!PETFINDER_API_KEY || !PETFINDER_API_SECRET) {
    PETFINDER_API_KEY = 'qkMLPpXf20tzvRovgSXIGOR6FC9sbGDBSPDTon4tuQLMDFhANM';
    PETFINDER_API_SECRET = 'zQL22VkF69uB4a1i4UZjGusBZbAjzHGpyUTJwkKn';
  }
  
  console.log('Testing Petfinder API Authentication');
  console.log('API Key available:', !!PETFINDER_API_KEY);
  console.log('API Secret available:', !!PETFINDER_API_SECRET);
  
  if (!PETFINDER_API_KEY || !PETFINDER_API_SECRET) {
    console.error('Missing API credentials!');
    return;
  }
  
  try {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', PETFINDER_API_KEY);
    formData.append('client_secret', PETFINDER_API_SECRET);
    
    console.log('Requesting token with form data...');
    
    const response = await axios.post('https://api.petfinder.com/v2/oauth2/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('Authentication successful!');
    console.log('Access token:', response.data.access_token.substring(0, 10) + '...');
    console.log('Token expires in:', response.data.expires_in, 'seconds');
  } catch (error) {
    console.error('Authentication failed:');
    console.error('Status:', error.response?.status);
    console.error('Error data:', error.response?.data || error.message);
  }
}

testAuth();