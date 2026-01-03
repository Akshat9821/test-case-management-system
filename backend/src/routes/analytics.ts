import express from 'express';
import pool from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import { analyticsLimiter } from '../middleware/rateLimiter';
import { cacheMiddleware } from '../middleware/cache';

const router = express.Router();

// Get dashboard analytics (cached for 15 minutes)
router.get('/dashboard', authenticate, analyticsLimiter, cacheMiddleware(15 * 60), async (req: AuthRequest, res) => {
  const defaultResponse = {
    summary: {
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      total_executions: 0,
      total_test_cases: 0,
      pending: 0,
    },
    trends: [],
    priority_distribution: [],
    tester_progress: [],
    defects: { total_defects: 0, open_defects: 0, resolved_defects: 0, closed_defects: 0 },
    coverage: { covered: 0, total: 0, percentage: 0 },
  };

  try {
    const { project_id } = req.query;

    const params: any[] = [];
    let paramCount = 0;

    // Test execution summary
    const summaryConditions = project_id ? 'WHERE te.project_id = $1' : '';
    if (project_id) {
      paramCount++;
      params.push(project_id);
    }

    const summaryResult = await pool.query(
      `SELECT 
       COUNT(*) FILTER (WHERE te.status = 'Pass') as passed,
       COUNT(*) FILTER (WHERE te.status = 'Fail') as failed,
       COUNT(*) FILTER (WHERE te.status = 'Blocked') as blocked,
       COUNT(*) FILTER (WHERE te.status = 'Skipped') as skipped,
       COUNT(*) as total_executions
       FROM test_executions te
       ${summaryConditions}`,
      params
    );

    // Total test cases
    const testCasesConditions = project_id ? 'WHERE tc.project_id = $1' : '';
    const testCasesResult = await pool.query(
      `SELECT COUNT(*) as total FROM test_cases tc ${testCasesConditions}`,
      params
    );

    // Pending test cases (not executed or last execution is old)
    const pendingConditions = project_id
      ? 'WHERE tc.project_id = $1 AND NOT EXISTS (SELECT 1 FROM test_executions te WHERE te.test_case_id = tc.id AND te.project_id = $1)'
      : 'WHERE NOT EXISTS (SELECT 1 FROM test_executions te WHERE te.test_case_id = tc.id)';
    const pendingResult = await pool.query(
      `SELECT COUNT(*) as pending FROM test_cases tc ${pendingConditions}`,
      params
    );

    // Pass/Fail rate trends over time (last 30 days)
    const trendsConditions = project_id
      ? `WHERE te.project_id = $1 AND execution_date >= CURRENT_DATE - INTERVAL '30 days'`
      : `WHERE execution_date >= CURRENT_DATE - INTERVAL '30 days'`;
    const trendsResult = await pool.query(
      `SELECT 
       DATE(execution_date) as date,
       COUNT(*) FILTER (WHERE status = 'Pass') as passed,
       COUNT(*) FILTER (WHERE status = 'Fail') as failed,
       COUNT(*) as total
       FROM test_executions te
       ${trendsConditions}
       GROUP BY DATE(execution_date)
       ORDER BY date ASC`,
      params
    );

    // Priority-wise test distribution
    const priorityResult = await pool.query(
      `SELECT priority, COUNT(*) as count
       FROM test_cases tc
       ${project_id ? 'WHERE tc.project_id = $1' : ''}
       GROUP BY priority
       ORDER BY 
         CASE priority
           WHEN 'Critical' THEN 1
           WHEN 'High' THEN 2
           WHEN 'Medium' THEN 3
           WHEN 'Low' THEN 4
         END`,
      params
    );

    // Test execution progress by tester
    const testerProgressQuery = project_id
      ? `SELECT 
         u.id, u.name, u.email,
         COUNT(*) FILTER (WHERE te.status = 'Pass') as passed,
         COUNT(*) FILTER (WHERE te.status = 'Fail') as failed,
         COUNT(*) FILTER (WHERE te.status = 'Blocked') as blocked,
         COUNT(*) as total
         FROM users u
         LEFT JOIN test_executions te ON u.id = te.executed_by AND te.project_id = $1
         GROUP BY u.id, u.name, u.email
         HAVING COUNT(te.id) > 0
         ORDER BY total DESC`
      : `SELECT 
         u.id, u.name, u.email,
         COUNT(*) FILTER (WHERE te.status = 'Pass') as passed,
         COUNT(*) FILTER (WHERE te.status = 'Fail') as failed,
         COUNT(*) FILTER (WHERE te.status = 'Blocked') as blocked,
         COUNT(*) as total
         FROM users u
         LEFT JOIN test_executions te ON u.id = te.executed_by
         GROUP BY u.id, u.name, u.email
         HAVING COUNT(te.id) > 0
         ORDER BY total DESC`;
    const testerProgressResult = await pool.query(testerProgressQuery, params);

    // Defect density metrics
    let defectResult;
    try {
      const defectQuery = project_id
        ? `SELECT 
           COUNT(*) as total_defects,
           COUNT(*) FILTER (WHERE d.status = 'Open') as open_defects,
           COUNT(*) FILTER (WHERE d.status = 'Resolved') as resolved_defects,
           COUNT(*) FILTER (WHERE d.status = 'Closed') as closed_defects
           FROM defects d
           LEFT JOIN test_executions te ON d.test_execution_id = te.id
           WHERE te.project_id = $1`
        : `SELECT 
           COUNT(*) as total_defects,
           COUNT(*) FILTER (WHERE status = 'Open') as open_defects,
           COUNT(*) FILTER (WHERE status = 'Resolved') as resolved_defects,
           COUNT(*) FILTER (WHERE status = 'Closed') as closed_defects
           FROM defects d`;
      defectResult = await pool.query(defectQuery, params);
    } catch (defectError) {
      defectResult = { rows: [{ total_defects: 0, open_defects: 0, resolved_defects: 0, closed_defects: 0 }] };
    }

    // Test coverage (test cases with at least one execution)
    let coverageResult;
    try {
      const coverageQuery = project_id
        ? `SELECT 
           COUNT(DISTINCT tc.id) as covered
           FROM test_cases tc
           INNER JOIN test_executions te ON tc.id = te.test_case_id
           WHERE tc.project_id = $1`
        : `SELECT 
           COUNT(DISTINCT tc.id) as covered
           FROM test_cases tc
           INNER JOIN test_executions te ON tc.id = te.test_case_id`;
      coverageResult = await pool.query(coverageQuery, params);
    } catch (coverageError) {
      // If no executions exist, coverage will be 0
      coverageResult = { rows: [{ covered: 0 }] };
    }

    const totalTestCases = parseInt(testCasesResult.rows[0]?.total || 0);
    const covered = parseInt(coverageResult.rows[0]?.covered || 0);

    const summary = summaryResult.rows[0] || {};

    res.json({
      summary: {
        passed: parseInt(summary.passed || 0),
        failed: parseInt(summary.failed || 0),
        blocked: parseInt(summary.blocked || 0),
        skipped: parseInt(summary.skipped || 0),
        total_executions: parseInt(summary.total_executions || 0),
        total_test_cases: totalTestCases,
        pending: parseInt(pendingResult.rows[0]?.pending || 0),
      },
      trends: trendsResult.rows || [],
      priority_distribution: priorityResult.rows || [],
      tester_progress: testerProgressResult.rows || [],
      defects: defectResult.rows[0] || { total_defects: 0, open_defects: 0, resolved_defects: 0, closed_defects: 0 },
      coverage: {
        covered: covered,
        total: totalTestCases,
        percentage: totalTestCases > 0 ? Math.round((covered / totalTestCases) * 100) : 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    console.error('Error details:', error.message);
    // Return default response instead of error to prevent frontend crash
    res.json(defaultResponse);
  }
});

// Get test execution trends
router.get('/trends', authenticate, analyticsLimiter, cacheMiddleware(15 * 60), async (req: AuthRequest, res) => {
  try {
    const { project_id, days = 30 } = req.query;

    const conditions = project_id ? 'WHERE te.project_id = $1' : '';
    const params = project_id ? [project_id] : [];

    const result = await pool.query(
      `SELECT 
       DATE(execution_date) as date,
       COUNT(*) FILTER (WHERE status = 'Pass') as passed,
       COUNT(*) FILTER (WHERE status = 'Fail') as failed,
       COUNT(*) FILTER (WHERE status = 'Blocked') as blocked,
       COUNT(*) FILTER (WHERE status = 'Skipped') as skipped,
       COUNT(*) as total
       FROM test_executions te
       ${conditions} ${project_id ? 'AND' : 'WHERE'} execution_date >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY DATE(execution_date)
       ORDER BY date ASC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

