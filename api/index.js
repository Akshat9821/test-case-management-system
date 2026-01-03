try {
    const backend = require('../backend/dist/server');
    const app = backend.default || backend;
    if (!app) {
        throw new Error('Backend app failed to load from ../backend/dist/server');
    }
    module.exports = app;
} catch (error) {
    console.error('Error loading backend:', error);
    module.exports = (req, res) => {
        res.status(500).json({
            error: 'Backend Initialization Error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            path: __dirname
        });
    };
}
