const axios = require('axios');
require('dotenv').config({ path: '../../.env' });

// For local development, use .env file
// For Netlify, these will be set in the Netlify dashboard
let PETFINDER_API_KEY = process.env.PETFINDER_API_KEY;
let PETFINDER_API_SECRET = process.env.PETFINDER_API_SECRET;

// Fallback for development if environment variables aren't loading
if (!PETFINDER_API_KEY || !PETFINDER_API_SECRET) {
  PETFINDER_API_KEY = 'qkMLPpXf20tzvRovgSXIGOR6FC9sbGDBSPDTon4tuQLMDFhANM';
  PETFINDER_API_SECRET = 'zQL22VkF69uB4a1i4UZjGusBZbAjzHGpyUTJwkKn';
}

console.log('Environment variables loaded:');
console.log('API Key available:', !!PETFINDER_API_KEY);
console.log('API Secret available:', !!PETFINDER_API_SECRET);

let tokenData = {
  token: '',
  expiry: 0
};

// Function to get an access token
async function getAccessToken() {
  // Check if token is still valid
  if (tokenData.token && tokenData.expiry > Date.now()) {
    return tokenData.token;
  }

  try {
    console.log('Requesting token with credentials:');
    console.log('client_id:', PETFINDER_API_KEY ? PETFINDER_API_KEY.substring(0, 5) + '...' : 'missing');
    console.log('client_secret:', PETFINDER_API_SECRET ? PETFINDER_API_SECRET.substring(0, 5) + '...' : 'missing');
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', PETFINDER_API_KEY);
    formData.append('client_secret', PETFINDER_API_SECRET);
    
    const response = await axios.post('https://api.petfinder.com/v2/oauth2/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Store token and calculate expiry (subtract 60 seconds for safety margin)
    tokenData.token = response.data.access_token;
    tokenData.expiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    
    return tokenData.token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

exports.handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  console.log('Request received:', {
    path: event.path,
    httpMethod: event.httpMethod,
    queryStringParameters: event.queryStringParameters
  });

  try {
    // Get access token
    const token = await getAccessToken();
    
    // Extract path parameters
    const path = event.path.replace('/.netlify/functions/petfinder-proxy', '');
    console.log('Path after replacement:', path);
    
    // Remove any duplicate /v2 prefix, as the frontend code is already adding it
    const cleanPath = path.replace(/^\/v2/, '');
    console.log('Path after cleaning:', cleanPath);
    
    const petfinderUrl = `https://api.petfinder.com/v2${cleanPath}${event.queryStringParameters ? '?' + new URLSearchParams(event.queryStringParameters).toString() : ''}`;
    console.log('Petfinder URL:', petfinderUrl);
    
    // Make request to Petfinder API
    const response = await axios.get(petfinderUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Petfinder API response status:', response.status);
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('Error proxying to Petfinder:', error.message);
    console.error('Error details:', {
      status: error.response?.status,
      data: error.response?.data,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers
      } : null
    });
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data || { message: 'Internal Server Error' };
    
    return {
      statusCode,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorMessage)
    };
  }
};