#!/bin/bash

# This script is used by Netlify to install dependencies for functions

echo "Installing project dependencies..."
npm install

echo "Installing function dependencies..."
cd netlify/functions
npm install
cd ../..

echo "Build completed successfully!"