// Vercel serverless function entry point with comprehensive error handling
const fs = require('fs');
const path = require('path');

let app = null;
let loadError = null;

// #region agent log
console.log(JSON.stringify({
  sessionId:'debug-session',
  runId:'pre-fix',
  hypothesisId:'H1',
  location:'api/index.js:startup',
  message:'api handler startup',
  data:{cwd:process.cwd()},
  timestamp:Date.now()
}));
// #endregion

try {
    console.log('=== API Handler Starting ===');
    console.log('Current directory:', __dirname);
    console.log('Process cwd:', process.cwd());

    // Check if backend/dist exists
    const distPath = path.join(__dirname, '..', 'backend', 'dist');
    const serverPath = path.join(distPath, 'server.js');

    console.log('Looking for backend at:', serverPath);
    console.log('Backend dist exists:', fs.existsSync(distPath));
    console.log('Server.js exists:', fs.existsSync(serverPath));

    if (fs.existsSync(distPath)) {
        const distFiles = fs.readdirSync(distPath);
        console.log('Files in dist:', distFiles);
    }

    // #region agent log
    console.log(JSON.stringify({
      sessionId:'debug-session',
      runId:'pre-fix',
      hypothesisId:'H1',
      location:'api/index.js:load',
      message:'loading backend dist',
      data:{serverPath, distExists:fs.existsSync(distPath), serverExists:fs.existsSync(serverPath)},
      timestamp:Date.now()
    }));
    // #endregion

    // Try to load the backend
    const serverModule = require('../backend/dist/server.js');
    console.log('Module loaded, type:', typeof serverModule);
    console.log('Has default:', !!serverModule.default);
    console.log('Default type:', typeof serverModule.default);

    app = serverModule.default || serverModule;
    console.log('App assigned, type:', typeof app);

    if (typeof app !== 'function') {
        throw new Error(`Expected app to be a function, got ${typeof app}`);
    }

    console.log('=== Backend loaded successfully ===');

    // #region agent log
    console.log(JSON.stringify({
      sessionId:'debug-session',
      runId:'pre-fix',
      hypothesisId:'H1',
      location:'api/index.js:loadSuccess',
      message:'backend load success',
      data:{appType:typeof app},
      timestamp:Date.now()
    }));
    // #endregion
} catch (error) {
    console.error('=== Backend loading failed ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    loadError = error;
}

// Export the handler
module.exports = (req, res) => {
    // If backend failed to load, return diagnostic information
    if (loadError || !app) {
        console.error('Handler called but backend not loaded');

        const distPath = path.join(__dirname, '..', 'backend', 'dist');
        const nodeModulesPath = path.join(__dirname, '..', 'node_modules');

        let diagnostics = {
            error: 'Backend failed to initialize',
            message: loadError ? loadError.message : 'Unknown error',
            stack: loadError ? loadError.stack : null,
            diagnostics: {
                cwd: process.cwd(),
                dirname: __dirname,
                backendDistExists: fs.existsSync(distPath),
                nodeModulesExists: fs.existsSync(nodeModulesPath),
                distFiles: fs.existsSync(distPath) ? fs.readdirSync(distPath) : [],
                env: {
                    NODE_ENV: process.env.NODE_ENV,
                    DATABASE_URL: process.env.DATABASE_URL ? '***SET***' : 'NOT SET',
                    JWT_SECRET: process.env.JWT_SECRET ? '***SET***' : 'NOT SET',
                }
            }
        };

        // Return as HTML for better readability
        res.statusCode = 200; // Use 200 to bypass Vercel error page
        res.setHeader('Content-Type', 'text/html');
        res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Backend Initialization Error</title>
        <style>
          body { font-family: monospace; padding: 20px; max-width: 1200px; margin: 0 auto; }
          h1 { color: #e11d48; }
          pre { background: #f1f5f9; padding: 15px; border-radius: 8px; overflow-x: auto; }
          .section { margin: 20px 0; }
          .label { font-weight: bold; color: #0369a1; }
        </style>
      </head>
      <body>
        <h1>🔴 Backend Initialization Failed</h1>
        <div class="section">
          <div class="label">Error Message:</div>
          <pre>${diagnostics.message}</pre>
        </div>
        <div class="section">
          <div class="label">Stack Trace:</div>
          <pre>${diagnostics.stack || 'No stack trace available'}</pre>
        </div>
        <div class="section">
          <div class="label">Diagnostics:</div>
          <pre>${JSON.stringify(diagnostics.diagnostics, null, 2)}</pre>
        </div>
        <div class="section">
          <div class="label">Instructions:</div>
          <p>1. Check that the backend build completed successfully in Vercel build logs</p>
          <p>2. Verify all environment variables are set in Vercel dashboard</p>
          <p>3. Check that DATABASE_URL and JWT_SECRET are configured</p>
        </div>
      </body>
      </html>
    `);
        return;
    }

    // Backend loaded successfully, forward the request
    try {
        // #region agent log
        console.log(JSON.stringify({
            sessionId:'debug-session',
            runId:'pre-fix',
            hypothesisId:'H1',
            location:'api/index.js:request-handler',
            message:'Forwarding request to Express app',
            data:{method:req.method, path:req.url},
            timestamp:Date.now()
        }));
        // #endregion
        app(req, res);
    } catch (error) {
        console.error('Error handling request:', error);
        // #region agent log
        console.log(JSON.stringify({
            sessionId:'debug-session',
            runId:'pre-fix',
            hypothesisId:'H1',
            location:'api/index.js:request-error',
            message:'Request handling error',
            data:{errorMessage:error?.message, errorName:error?.name},
            timestamp:Date.now()
        }));
        // #endregion
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: 'Request handling failed',
            message: error?.message || 'Unknown error'
        }));
    }
};
