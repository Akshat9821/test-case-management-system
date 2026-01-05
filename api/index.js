// Vercel serverless function entry point
// This loads the compiled Express backend from backend/dist

try {
    // Load the compiled backend server
    const app = require('../backend/dist/server.js');

    // Export the Express app as the serverless function handler
    module.exports = app;
} catch (error) {
    console.error('Failed to load backend:', error);

    // Fallback handler that provides diagnostic information
    module.exports = (req, res) => {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: 'Backend initialization failed',
            message: error.message,
            stack: error.stack,
            hint: 'Check Vercel build logs for backend compilation errors'
        }));
    };
}
