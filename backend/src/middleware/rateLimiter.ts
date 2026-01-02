import rateLimit from 'express-rate-limit';

// Auth endpoints: 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Test case CRUD endpoints: 100 requests per hour
export const testCaseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Too many requests for test case operations, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Test execution endpoints: 200 requests per hour
export const testExecutionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200,
  message: 'Too many test execution requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Analytics endpoints: 50 requests per hour
export const analyticsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many analytics requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});


