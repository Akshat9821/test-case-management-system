import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis with timeout
(async () => {
  try {
    if (process.env.REDIS_URL && !redisClient.isOpen) {
      const connectPromise = redisClient.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 2000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      console.log('Redis connected');
    }
  } catch (error) {
    console.error('Redis connection failed or timed out:', error);
    // Continue without Redis
  }
})();

export const cacheMiddleware = (duration: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // Store original json function
      const originalJson = res.json.bind(res);

      // Override json function to cache response
      res.json = function (body: any) {
        redisClient.setEx(key, duration, JSON.stringify(body)).catch(console.error);
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};

export const invalidateCache = async (pattern: string) => {
  try {
    const keys = await redisClient.keys(`cache:${pattern}*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

export default redisClient;

