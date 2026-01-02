import express, { Response } from 'express';
import pool from '../db/connection';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validateTestCase, handleValidationErrors, sanitizeInput } from '../middleware/validation';
import { testCaseLimiter, testExecutionLimiter } from '../middleware/rateLimiter';
import { invalidateCache } from '../middleware/cache';

const router = express.Router();

// Get all test cases with filters and pagination
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      project_id,
      priority,
      type,
      assigned_to,
      search,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      order = 'DESC',
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;
    
    // Build WHERE clause
    if (project_id) {
      paramCount++;
      conditions.push(`tc.project_id = $${paramCount}`);
      params.push(project_id);
    }
    
    if (priority) {
      paramCount++;
      conditions.push(`tc.priority = $${paramCount}`);
      params.push(priority);
    }
    
    if (type) {
      paramCount++;
      conditions.push(`tc.type = $${paramCount}`);
      params.push(type);
    }
    
    if (assigned_to) {
      paramCount++;
      conditions.push(`tc.assigned_to = $${paramCount}`);
      params.push(assigned_to);
    }
    
    if (search) {
      paramCount++;
      conditions.push(`(tc.title ILIKE $${paramCount} OR tc.description ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM test_cases tc ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Get test cases
    paramCount++;
    params.push(Number(limit));
    paramCount++;
    params.push(offset);
    
    const result = await pool.query(
      `SELECT tc.*, 
       u1.name as created_by_name,
       u2.name as assigned_to_name,
       (SELECT COUNT(*) FROM test_executions WHERE test_case_id = tc.id) as execution_count
       FROM test_cases tc
       LEFT JOIN users u1 ON tc.created_by = u1.id
       LEFT JOIN users u2 ON tc.assigned_to = u2.id
       ${whereClause}
       ORDER BY tc.${sort_by} ${order}
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
    console.error('Error fetching test cases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get test case by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT tc.*,
       u1.name as created_by_name,
       u2.name as assigned_to_name
       FROM test_cases tc
       LEFT JOIN users u1 ON tc.created_by = u1.id
       LEFT JOIN users u2 ON tc.assigned_to = u2.id
       WHERE tc.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    
    // Get test steps
    const steps = await pool.query(
      'SELECT * FROM test_steps WHERE test_case_id = $1 ORDER BY step_number',
      [id]
    );
    
    // Get test executions
    const executions = await pool.query(
      `SELECT te.*, u.name as executed_by_name
       FROM test_executions te
       LEFT JOIN users u ON te.executed_by = u.id
       WHERE te.test_case_id = $1
       ORDER BY te.execution_date DESC
       LIMIT 10`,
      [id]
    );
    
    res.json({
      ...result.rows[0],
      steps: steps.rows,
      recent_executions: executions.rows,
    });
  } catch (error) {
    console.error('Error fetching test case:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create test case (admin and test-lead only)
router.post(
  '/',
  authenticate,
  authorize('admin', 'test-lead'),
  testCaseLimiter,
  sanitizeInput,
  validateTestCase,
  handleValidationErrors,
  async (req: AuthRequest, res: Response) => {
    try {
      const { title, description, priority, type, pre_conditions, post_conditions, tags, project_id, assigned_to, steps } = req.body;
      const createdBy = req.user!.id;
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Insert test case
        const result = await client.query(
          `INSERT INTO test_cases (title, description, priority, type, pre_conditions, post_conditions, tags, project_id, created_by, assigned_to)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [title, description, priority, type, pre_conditions, post_conditions, tags || [], project_id, createdBy, assigned_to]
        );
        
        const testCaseId = result.rows[0].id;
        
        // Insert test steps
        if (steps && Array.isArray(steps)) {
          for (const step of steps) {
            await client.query(
              'INSERT INTO test_steps (test_case_id, step_number, action, expected_result) VALUES ($1, $2, $3, $4)',
              [testCaseId, step.step_number, step.action, step.expected_result]
            );
          }
        }
        
        await client.query('COMMIT');
        
        await invalidateCache('/api/testcases');
        
        res.status(201).json(result.rows[0]);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating test case:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update test case (admin and test-lead only)
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'test-lead'),
  testCaseLimiter,
  sanitizeInput,
  validateTestCase,
  handleValidationErrors,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, priority, type, pre_conditions, post_conditions, tags, assigned_to, steps } = req.body;
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Update test case
        const result = await client.query(
          `UPDATE test_cases 
           SET title = $1, description = $2, priority = $3, type = $4, pre_conditions = $5, 
               post_conditions = $6, tags = $7, assigned_to = $8, updated_at = CURRENT_TIMESTAMP
           WHERE id = $9 RETURNING *`,
          [title, description, priority, type, pre_conditions, post_conditions, tags || [], assigned_to, id]
        );
        
        if (result.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Test case not found' });
        }
        
        // Update test steps (delete old and insert new)
        if (steps && Array.isArray(steps)) {
          await client.query('DELETE FROM test_steps WHERE test_case_id = $1', [id]);
          for (const step of steps) {
            await client.query(
              'INSERT INTO test_steps (test_case_id, step_number, action, expected_result) VALUES ($1, $2, $3, $4)',
              [id, step.step_number, step.action, step.expected_result]
            );
          }
        }
        
        await client.query('COMMIT');
        
        await invalidateCache('/api/testcases');
        
        res.json(result.rows[0]);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating test case:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete test case (admin and test-lead only)
router.delete('/:id', authenticate, authorize('admin', 'test-lead'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM test_cases WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    
    await invalidateCache('/api/testcases');
    
    res.json({ message: 'Test case deleted successfully' });
  } catch (error) {
    console.error('Error deleting test case:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk operations (admin and test-lead only)
router.post('/bulk', authenticate, authorize('admin', 'test-lead'), sanitizeInput, async (req: AuthRequest, res) => {
  try {
    const { action, test_case_ids, data } = req.body;
    
    if (!Array.isArray(test_case_ids) || test_case_ids.length === 0) {
      return res.status(400).json({ error: 'test_case_ids must be a non-empty array' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (action === 'delete') {
        await client.query('DELETE FROM test_cases WHERE id = ANY($1)', [test_case_ids]);
      } else if (action === 'update_priority' && data?.priority) {
        await client.query('UPDATE test_cases SET priority = $1 WHERE id = ANY($2)', [data.priority, test_case_ids]);
      } else if (action === 'assign' && data?.assigned_to) {
        await client.query('UPDATE test_cases SET assigned_to = $1 WHERE id = ANY($2)', [data.assigned_to, test_case_ids]);
      } else {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid action or missing data' });
      }
      
      await client.query('COMMIT');
      
      await invalidateCache('/api/testcases');
      
      res.json({ message: 'Bulk operation completed successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

