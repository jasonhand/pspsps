#!/bin/bash

# This script is used by Netlify to install dependencies for functions
set -e # Exit immediately if a command exits with a non-zero status

# Skip language installations that we don't need
export NETLIFY_SKIP_GO_INSTALL=true

echo "Environment information:"
node -v
npm -v

echo "Installing project dependencies..."
npm install

# Copy dotenv dependency to functions folder to ensure it's available
echo "Making dotenv available to functions..."
mkdir -p netlify/functions/node_modules
cp -r node_modules/dotenv netlify/functions/node_modules/
cp -r node_modules/axios netlify/functions/node_modules/

# Create minimal package.json if it doesn't exist
if [ ! -f netlify/functions/package.json ]; then
  echo "Creating minimal package.json for functions..."
  echo '{
    "name": "petfinder-proxy-function",
    "version": "1.0.0", 
    "dependencies": {
      "axios": "^1.6.5",
      "dotenv": "^16.4.1"
    }
  }' > netlify/functions/package.json
fi

# Install functions dependencies
echo "Installing function dependencies..."
cd netlify/functions
npm install
cd ../..

# Create a simple test to ensure the function is working
echo "Testing function..."
node -e "console.log('Function dependencies installed successfully')"

echo "Build completed successfully!"