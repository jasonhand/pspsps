const axios = require('axios');

// Simple inline dotenv implementation (in case the module is not available)
function loadEnv() {
  try {
    // Try to use the regular dotenv package first
    require('dotenv').config({ path: '../../.env' });
  } catch (error) {
    console.log('dotenv module not available, using inline implementation');
    try {
      // Minimal inline implementation of dotenv
      const fs = require('fs');
      const path = require('path');
      const envPath = path.resolve(__dirname, '../../.env');
      
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envLines = envContent.split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));
        
        envLines.forEach(line => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=');
            process.env[key.trim()] = value.trim();
          }
        });
        
        console.log('Environment variables loaded from .env file');
      } else {
        console.log('.env file not found, using system environment variables');
      }
    } catch (innerError) {
      console.log('Error loading .env file:', innerError.message);
      console.log('Continuing with system environment variables');
    }
  }
}

// Load environment variables
loadEnv();

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

  console.log('[FUNCTION] Request received:', JSON.stringify({
    path: event.path,
    httpMethod: event.httpMethod,
    queryStringParameters: event.queryStringParameters
  }));

  try {
    // Get access token
    console.log('[FUNCTION] Getting access token...');
    const token = await getAccessToken();
    console.log('[FUNCTION] Access token received');
    
    // Extract path parameters
    const path = event.path.replace('/.netlify/functions/petfinder-proxy', '');
    console.log('[FUNCTION] Path after replacement:', path);
    
    let petfinderUrl;
    
    // Handle the case where path is empty or just a slash
    if (!path || path === '/') {
      petfinderUrl = 'https://api.petfinder.com/v2/animals';
      if (event.queryStringParameters) {
        petfinderUrl += '?' + new URLSearchParams(event.queryStringParameters).toString();
      }
    } else {
      petfinderUrl = `https://api.petfinder.com/v2${path}`;
      if (event.queryStringParameters) {
        petfinderUrl += '?' + new URLSearchParams(event.queryStringParameters).toString();
      }
    }
    
    console.log('[FUNCTION] Petfinder URL:', petfinderUrl);
    
    // Make request to Petfinder API
    console.log('[FUNCTION] Making request to Petfinder API...');
    const response = await axios.get(petfinderUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('[FUNCTION] Petfinder API response status:', response.status);
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('[FUNCTION] Error proxying to Petfinder:', error.message);
    console.error('[FUNCTION] Error details:', JSON.stringify({
      status: error.response?.status,
      data: error.response?.data,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method
      } : null
    }));
    
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