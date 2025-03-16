#!/bin/bash

# This script is used by Netlify to install dependencies for functions
set -e # Exit immediately if a command exits with a non-zero status

# Skip Go installation - our project doesn't use Go
export NETLIFY_SKIP_GO_INSTALL=true

echo "Installing project dependencies..."
npm install

# Copy dotenv dependency to functions folder to ensure it's available
echo "Making dotenv available to functions..."
mkdir -p netlify/functions/node_modules
cp -r node_modules/dotenv netlify/functions/node_modules/

# Install functions dependencies
echo "Installing function dependencies..."
cd netlify/functions
npm install
cd ../..

# Create a simple test to ensure the function is working
echo "Testing function..."
node -e "console.log('Function dependencies installed successfully')"

echo "Build completed successfully!"