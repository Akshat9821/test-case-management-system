const fs = require('fs');
const path = require('path');

// Helper to list files for debugging
const listFiles = (dir) => {
    try {
        if (!fs.existsSync(dir)) return `Directory ${dir} does not exist`;
        return fs.readdirSync(dir).join(', ');
    } catch (e) {
        return `Error listing ${dir}: ${e.message}`;
    }
};

try {
    // Explicitly check for the file
    // In Vercel, __dirname for api/index.js is usually /var/task/api
    const backendDistPath = path.join(__dirname, '../backend/dist');
    const backendServerPath = path.join(backendDistPath, 'server.js');

    if (!fs.existsSync(backendServerPath)) {
        throw new Error(`Server file not found at ${backendServerPath}. Files in ../backend/dist: ${listFiles(backendDistPath)}`);
    }

    const backend = require('../backend/dist/server');
    // Handle ES Module default export vs CommonJS
    const app = backend.default || backend;

    if (!app || typeof app !== 'function') {
        throw new Error('Backend module loaded but did not export an Express app (function). Exports were: ' + Object.keys(backend).join(', '));
    }

    module.exports = app;

} catch (error) {
    console.error('CRITICAL: Failed to load backend:', error);

    // Fallback handler that returns 200 OK with the error message
    // returning 200 ensures Vercel doesn't show the "Function Crashed" page
    module.exports = (req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(`
            <html>
            <body style="font-family: sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto;">
                <h1 style="color: #e11d48;">Startup Error</h1>
                <p>The backend failed to initialize properly. This page is a safety net to show the error.</p>
                <div style="background: #f1f5f9; padding: 1rem; border-radius: 8px; overflow: auto;">
                    <pre style="white-space: pre-wrap;">${error.stack || error.toString()}</pre>
                </div>
                <h3>Debug Info:</h3>
                <ul>
                    <li><strong>Current Directory:</strong> ${process.cwd()}</li>
                    <li><strong>__dirname:</strong> ${__dirname}</li>
                    <li><strong>Files in api/:</strong> ${listFiles(__dirname)}</li>
                    <li><strong>Files in ../backend:</strong> ${listFiles(path.join(__dirname, '../backend'))}</li>
                    <li><strong>Files in ../backend/dist:</strong> ${listFiles(path.join(__dirname, '../backend/dist'))}</li>
                </ul>
                <p>Please share this screenshot with support.</p>
            </body>
            </html>
        `);
    };
}
