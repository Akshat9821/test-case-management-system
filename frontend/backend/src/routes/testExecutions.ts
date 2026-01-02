import express, { Response } from 'express';
import pool from '../db/connection';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validateTestExecution, handleValidationErrors, sanitizeInput } from '../middleware/validation';
import { testExecutionLimiter } from '../middleware/rateLimiter';
import { invalidateCache } from '../middleware/cache';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Get all test executions with filters
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      test_case_id,
      project_id,
      suite_id,
      executed_by,
      status,
      page = 1,
      limit = 20,
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;
    
    if (test_case_id) {
      paramCount++;
      conditions.push(`te.test_case_id = $${paramCount}`);
      params.push(test_case_id);
    }
    
    if (project_id) {
      paramCount++;
      conditions.push(`te.project_id = $${paramCount}`);
      params.push(project_id);
    }
    
    if (suite_id) {
      paramCount++;
      conditions.push(`te.suite_id = $${paramCount}`);
      params.push(suite_id);
    }
    
    if (executed_by) {
      paramCount++;
      conditions.push(`te.executed_by = $${paramCount}`);
      params.push(executed_by);
    }
    
    if (status) {
      paramCount++;
      conditions.push(`te.status = $${paramCount}`);
      params.push(status);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countResult = await pool.query(`SELECT COUNT(*) FROM test_executions te ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Get executions
    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);
    
    const result = await pool.query(
      `SELECT te.*, 
       tc.title as test_case_title,
       u.name as executed_by_name,
       p.name as project_name
       FROM test_executions te
       LEFT JOIN test_cases tc ON te.test_case_id = tc.id
       LEFT JOIN users u ON te.executed_by = u.id
       LEFT JOIN projects p ON te.project_id = p.id
       ${whereClause}
       ORDER BY te.execution_date DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );
    
    res.json({
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching test executions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get test execution by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT te.*,
       tc.title as test_case_title,
       tc.description as test_case_description,
       u.name as executed_by_name,
       p.name as project_name
       FROM test_executions te
       LEFT JOIN test_cases tc ON te.test_case_id = tc.id
       LEFT JOIN users u ON te.executed_by = u.id
       LEFT JOIN projects p ON te.project_id = p.id
       WHERE te.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test execution not found' });
    }
    
    // Get attachments
    const attachments = await pool.query(
      'SELECT * FROM test_attachments WHERE test_execution_id = $1',
      [id]
    );
    
    res.json({
      ...result.rows[0],
      attachments: attachments.rows,
    });
  } catch (error) {
    console.error('Error fetching test execution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create test execution (admin, test-lead, and tester only)
router.post(
  '/',
  authenticate,
  authorize('admin', 'test-lead', 'tester'),
  testExecutionLimiter,
  sanitizeInput,
  validateTestExecution,
  handleValidationErrors,
  async (req: AuthRequest, res: Response) => {
    try {
      const { test_case_id, status, comments, project_id, suite_id } = req.body;
      const executedBy = req.user!.id;
      
      const result = await pool.query(
        `INSERT INTO test_executions (test_case_id, executed_by, status, comments, project_id, suite_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [test_case_id, executedBy, status, comments, project_id, suite_id]
      );
      
      await invalidateCache('/api/testexecutions');
      await invalidateCache('/api/analytics');
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating test execution:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update test execution (admin, test-lead, and tester only)
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'test-lead', 'tester'),
  testExecutionLimiter,
  sanitizeInput,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, comments } = req.body;
      
      const result = await pool.query(
        'UPDATE test_executions SET status = $1, comments = $2 WHERE id = $3 RETURNING *',
        [status, comments, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Test execution not found' });
      }
      
      await invalidateCache('/api/testexecutions');
      await invalidateCache('/api/analytics');
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating test execution:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Upload attachment for test execution
router.post(
  '/:id/attachments',
  authenticate,
  authorize('admin', 'test-lead', 'tester'),
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const result = await pool.query(
        `INSERT INTO test_attachments (test_execution_id, file_name, file_path, file_type, file_size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          id,
          req.file.originalname,
          req.file.path,
          req.file.mimetype,
          req.file.size,
          req.user!.id,
        ]
      );
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error uploading attachment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Create defect from failed test execution
router.post(
  '/:id/defect',
  authenticate,
  authorize('admin', 'test-lead', 'tester'),
  sanitizeInput,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, severity } = req.body;
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Get test execution
        const execResult = await client.query('SELECT * FROM test_executions WHERE id = $1', [id]);
        if (execResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Test execution not found' });
        }
        
        const execution = execResult.rows[0];
        
        // Create defect
        const defectResult = await client.query(
          `INSERT INTO defects (title, description, severity, status, test_execution_id, test_case_id, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [title, description, severity || 'Medium', 'Open', id, execution.test_case_id, req.user!.id]
        );
        
        // Update test execution with defect_id
        await client.query('UPDATE test_executions SET defect_id = $1 WHERE id = $2', [
          defectResult.rows[0].id,
          id,
        ]);
        
        await client.query('COMMIT');
        
        res.status(201).json(defectResult.rows[0]);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating defect:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

