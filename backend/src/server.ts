import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

dotenv.config();

import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import testCaseRoutes from './routes/testCases';
import testSuiteRoutes from './routes/testSuites';
import testExecutionRoutes from './routes/testExecutions';
import analyticsRoutes from './routes/analytics';
import userRoutes from './routes/users';
import debugRoutes from './routes/debug';

const app = express();
const PORT = process.env.PORT || 5000;

// #region agent log
console.log(JSON.stringify({
  sessionId: 'debug-session',
  runId: 'run1',
  hypothesisId: 'H1',
  location: 'backend/src/server.ts:initialization',
  message: 'Server startup config',
  data: { port: PORT, nodeEnv: process.env.NODE_ENV, hasDbUrl: !!process.env.DATABASE_URL },
  timestamp: Date.now()
}));
// #endregion

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Test Case Management API',
      version: '1.0.0',
      description: 'API documentation for Test Case Management System',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// #region agent log
console.log(JSON.stringify({
  sessionId:'debug-session',
  runId:'pre-fix',
  hypothesisId:'H2',
  location:'backend/src/server.ts:startup',
  message:'server startup',
  data:{nodeEnv:process.env.NODE_ENV, hasDbUrl:!!process.env.DATABASE_URL},
  timestamp:Date.now()
}));
// #endregion

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/testcases', testCaseRoutes);
app.use('/api/testsuites', testSuiteRoutes);
app.use('/api/testexecutions', testExecutionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/debug', debugRoutes);

// Health check
app.get('/api/health', (req, res) => {
  // #region agent log
  console.log(JSON.stringify({
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'H2',
    location: 'backend/src/server.ts:/api/health',
    message: 'Health endpoint hit',
    data: { path: req.path, hasDbUrl: !!process.env.DATABASE_URL },
    timestamp: Date.now()
  }));
  // #endregion
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  // #region agent log
  console.log(JSON.stringify({
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'H3',
    location: 'backend/src/server.ts:error-middleware',
    message: 'Express error middleware invoked',
    data: { status: err?.status, message: err?.message, stack: !!err?.stack },
    timestamp: Date.now()
  }));
  // #endregion
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
  });
}

export default app;





