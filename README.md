# PsPsPs

A streamlined pet adoption search application using the Petfinder API to find cats, dogs, and other adoptable pets without advertisements.

![](images/PsPsPs.png)

![](images/PsPsPs2.png)

## Features

- **Simple, Clean Interface**: Focus on what matters - the pets available for adoption
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Advanced Filtering**: Filter by animal type, gender, age, and distance
- **Detailed Information**: View comprehensive details about each pet
- **Local Caching**: Reduces API usage and improves performance
- **Organization Details**: Learn about the adoption agencies and shelters

## How to Run Locally

### Prerequisites

- Node.js (v14 or higher)
- Petfinder API credentials (obtain from [Petfinder's Developer Portal](https://www.petfinder.com/developers/))

### Setup

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/pspsps.git
   cd pspsps
   ```

2. Create a `.env` file in the root directory with your Petfinder API credentials:
   ```
   PETFINDER_API_KEY=your_api_key
   PETFINDER_API_SECRET=your_api_secret
   ```

3. Run the start script to install dependencies and start the Netlify development server:
   ```
   ./start-dev.sh
   ```
   
   This will:
   - Install the required dependencies
   - Start the Netlify Dev server on port 8888
   - Set up the serverless function for API proxying
   
   Alternatively, you can run these steps manually:
   ```
   npm install
   cd netlify/functions && npm install && cd ../..
   npx netlify dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:8888
   ```

## Technical Details

### Caching System

This application implements a client-side caching mechanism to reduce API requests and improve performance:

- **Search Results Caching**: Searches with the same location and filters are cached
- **Pet Details Caching**: Individual pet details are cached by ID
- **Organization Caching**: Shelter/rescue information is cached
- **Cache Expiration**: All cached data expires after 24 hours
- **Storage Management**: Automatically clears oldest entries when storage is full

### API Proxy

The application uses a Netlify serverless function to proxy requests to the Petfinder API, which handles:

- Authentication with the Petfinder API
- Token refreshing
- Error handling
- Rate limiting protection

### Directory Structure

- `/js`: Main application JavaScript files
- `/netlify/functions`: Serverless functions for API proxying
- `/images`: Application images and assets
- `/styles.css`: Main stylesheet

## Debugging

If you encounter issues with the API proxy:

1. Test the API connection directly:
   ```
   node debug-api.js
   ```
   This will verify if the Petfinder API is working correctly with your credentials.

2. Test the serverless function:
   ```
   node test-serverless.js
   ```
   This tests the serverless function directly without going through Netlify Dev.

3. Common issues:
   - Make sure your API requests go to `/.netlify/functions/petfinder-proxy/...`
   - Check browser console for detailed error messages
   - Verify your .env file has the correct API credentials
   - Try clearing your browser cache if you see stale data

## Deployment to Netlify

1. Push your repository to GitHub
2. Log in to Netlify and create a new site from your GitHub repository
3. Add the following environment variables in the Netlify dashboard:
   - `PETFINDER_API_KEY`: Your Petfinder API key
   - `PETFINDER_API_SECRET`: Your Petfinder API secret
4. Deploy your site

Netlify will automatically detect the `netlify.toml` configuration and deploy the site with the serverless function.

## License

See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Petfinder API](https://www.petfinder.com/developers/) for providing pet data
- All the animal shelters and rescues doing the important work of caring for animals in need