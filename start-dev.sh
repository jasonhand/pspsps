#!/bin/bash

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Install function dependencies if they don't exist
if [ ! -d "netlify/functions/node_modules" ]; then
  echo "Installing function dependencies..."
  cd netlify/functions && npm install && cd ../..
fi

# Start Netlify dev server
echo "Starting Netlify dev server..."
echo "If you encounter 404 errors, here's what to check:"
echo "1. Make sure your API requests go to /api/v2/... (not /v2/...)"
echo "2. Check the console for detailed error messages"
echo "3. The API proxy is configured to run at http://localhost:8888/.netlify/functions/petfinder-proxy"
echo ""
echo "Starting server now..."
npx netlify dev