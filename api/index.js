const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is working!' });
});

// Import and use the actual backend
try {
    const backendApp = require('../backend/dist/server').default;
    app.use(backendApp);
} catch (error) {
    console.error('Failed to load backend:', error);
    app.use((req, res) => {
        res.status(500).json({
            error: 'Backend initialization failed',
            message: error.message
        });
    });
}

module.exports = app;
