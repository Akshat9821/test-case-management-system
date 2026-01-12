import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Sanitize input to prevent XSS
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove potentially dangerous characters
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };
  
  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  next();
};

// Validation rules
export const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty().escape(),
];

export const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export const validateTestCase = [
  body('title').trim().notEmpty().isLength({ max: 500 }),
  body('priority').isIn(['Low', 'Medium', 'High', 'Critical']),
  body('type').isIn(['Functional', 'Integration', 'Regression', 'Smoke', 'UI', 'API']),
  body('project_id').isInt(),
];

export const validateProject = [
  body('name').trim().notEmpty().isLength({ max: 255 }),
  body('version').optional().isLength({ max: 50 }),
  body('status').optional().isIn(['active', 'inactive', 'archived']),
];

export const validateTestExecution = [
  body('test_case_id').isInt(),
  body('status').isIn(['Pass', 'Fail', 'Blocked', 'Skipped', 'Pending']),
  body('project_id').isInt(),
];

// Middleware to check validation results
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};






