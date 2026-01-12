import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis with timeout - non-blocking, don't crash if it fails
(async () => {
  try {
    if (process.env.REDIS_URL && !redisClient.isOpen) {
      const connectPromise = redisClient.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 2000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      console.log('Redis connected');
      // #region agent log
      console.log(JSON.stringify({
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H1',
        location: 'backend/src/middleware/cache.ts:redis-connected',
        message: 'Redis connection successful',
        data: {},
        timestamp: Date.now()
      }));
      // #endregion
    }
  } catch (error: any) {
    console.error('Redis connection failed or timed out:', error);
    // #region agent log
    console.log(JSON.stringify({
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H1',
      location: 'backend/src/middleware/cache.ts:redis-failed',
      message: 'Redis connection failed - continuing without cache',
      data: { errorMessage: error?.message },
      timestamp: Date.now()
    }));
    // #endregion
    // Continue without Redis - don't crash the app
  }
})().catch((error) => {
  // Extra safety - catch any unhandled promise rejections
  console.error('Redis initialization error (caught):', error);
});

export const cacheMiddleware = (duration: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      // Check if Redis is available before using it
      if (!redisClient.isOpen) {
        return next();
      }
      const cached = await redisClient.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // Store original json function
      const originalJson = res.json.bind(res);

      // Override json function to cache response
      res.json = function (body: any) {
        if (redisClient.isOpen) {
          redisClient.setEx(key, duration, JSON.stringify(body)).catch(console.error);
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache error:', error);
      // Always continue - cache is optional
      next();
    }
  };
};

export const invalidateCache = async (pattern: string) => {
  try {
    if (!redisClient.isOpen) {
      return; // Redis not available, skip cache invalidation
    }
    const keys = await redisClient.keys(`cache:${pattern}*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
    // Don't throw - cache is optional
  }
};

export default redisClient;

