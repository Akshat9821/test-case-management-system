import express from 'express';
import pool from '../db/connection';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { sanitizeInput } from '../middleware/validation';
import { invalidateCache, cacheMiddleware } from '../middleware/cache';

const router = express.Router();

// Get all test suites - cached for 30 minutes
router.get('/', authenticate, cacheMiddleware(30 * 60), async (req: AuthRequest, res) => {
  try {
    const { project_id } = req.query;

    let query = `SELECT ts.*, u.name as created_by_name, p.name as project_name,
                 (SELECT COUNT(*) FROM test_suite_cases WHERE suite_id = ts.id) as test_case_count
                 FROM test_suites ts
                 LEFT JOIN users u ON ts.created_by = u.id
                 LEFT JOIN projects p ON ts.project_id = p.id`;
    const params: any[] = [];

    if (project_id) {
      query += ' WHERE ts.project_id = $1';
      params.push(project_id);
    }

    query += ' ORDER BY ts.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching test suites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get test suite by ID with test cases - cached for 30 minutes
router.get('/:id', authenticate, cacheMiddleware(30 * 60), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const suiteResult = await pool.query(
      `SELECT ts.*, u.name as created_by_name, p.name as project_name
       FROM test_suites ts
       LEFT JOIN users u ON ts.created_by = u.id
       LEFT JOIN projects p ON ts.project_id = p.id
       WHERE ts.id = $1`,
      [id]
    );

    if (suiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test suite not found' });
    }

    // Get test cases in suite
    const testCases = await pool.query(
      `SELECT tc.*, u.name as assigned_to_name
       FROM test_cases tc
       JOIN test_suite_cases tsc ON tc.id = tsc.test_case_id
       LEFT JOIN users u ON tc.assigned_to = u.id
       WHERE tsc.suite_id = $1
       ORDER BY tc.created_at DESC`,
      [id]
    );

    res.json({
      ...suiteResult.rows[0],
      test_cases: testCases.rows,
    });
  } catch (error) {
    console.error('Error fetching test suite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create test suite (admin and test-lead only)
router.post(
  '/',
  authenticate,
  authorize('admin', 'test-lead'),
  sanitizeInput,
  async (req: AuthRequest, res) => {
    try {
      const { name, description, project_id, test_case_ids } = req.body;
      const createdBy = req.user!.id;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const result = await client.query(
          'INSERT INTO test_suites (name, description, project_id, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
          [name, description, project_id, createdBy]
        );

        const suiteId = result.rows[0].id;

        // Add test cases to suite
        if (test_case_ids && Array.isArray(test_case_ids)) {
          for (const testCaseId of test_case_ids) {
            await client.query(
              'INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [suiteId, testCaseId]
            );
          }
        }

        await client.query('COMMIT');

        await invalidateCache('/api/testsuites');

        res.status(201).json(result.rows[0]);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating test suite:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update test suite (admin and test-lead only)
router.put('/:id', authenticate, authorize('admin', 'test-lead'), sanitizeInput, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const result = await pool.query(
      'UPDATE test_suites SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test suite not found' });
    }

    await invalidateCache('/api/testsuites');

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating test suite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete test suite (admin and test-lead only)
router.delete('/:id', authenticate, authorize('admin', 'test-lead'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM test_suites WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test suite not found' });
    }

    await invalidateCache('/api/testsuites');

    res.json({ message: 'Test suite deleted successfully' });
  } catch (error) {
    console.error('Error deleting test suite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add test case to suite (admin and test-lead only)
router.post('/:id/test-cases', authenticate, authorize('admin', 'test-lead'), sanitizeInput, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { test_case_id } = req.body;

    await pool.query(
      'INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, test_case_id]
    );

    await invalidateCache('/api/testsuites');

    res.status(201).json({ message: 'Test case added to suite' });
  } catch (error) {
    console.error('Error adding test case to suite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove test case from suite (admin and test-lead only)
router.delete('/:id/test-cases/:testCaseId', authenticate, authorize('admin', 'test-lead'), async (req: AuthRequest, res) => {
  try {
    const { id, testCaseId } = req.params;

    await pool.query('DELETE FROM test_suite_cases WHERE suite_id = $1 AND test_case_id = $2', [id, testCaseId]);

    await invalidateCache('/api/testsuites');

    res.json({ message: 'Test case removed from suite' });
  } catch (error) {
    console.error('Error removing test case from suite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;






