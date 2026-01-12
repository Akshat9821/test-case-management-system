import express from 'express';
import pool from '../db/connection';

const router = express.Router();

router.get('/db-check', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();

        // #region agent log
        console.log(JSON.stringify({
          sessionId:'debug-session',
          runId:'pre-fix',
          hypothesisId:'H3',
          location:'backend/src/routes/debug.ts:db-check',
          message:'db check ok',
          data:{nodeEnv:process.env.NODE_ENV, hasDbUrl:!!process.env.DATABASE_URL},
          timestamp:Date.now()
        }));
        // #endregion

        res.json({
            status: 'success',
            message: 'Database connection successful',
            time: result.rows[0],
            env: {
                node_env: process.env.NODE_ENV,
                has_db_url: !!process.env.DATABASE_URL
            }
        });
    } catch (error: any) {
        console.error('DB Connection Check Failed:', error);

        // #region agent log
        console.log(JSON.stringify({
          sessionId:'debug-session',
          runId:'pre-fix',
          hypothesisId:'H3',
          location:'backend/src/routes/debug.ts:db-check',
          message:'db check failed',
          data:{error:error.message, nodeEnv:process.env.NODE_ENV, hasDbUrl:!!process.env.DATABASE_URL},
          timestamp:Date.now()
        }));
        // #endregion

        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            error: error.message,
            detail: error,
            env: {
                node_env: process.env.NODE_ENV,
                has_db_url: !!process.env.DATABASE_URL
            }
        });
    }
});

router.get('/env-check', (req, res) => {
    res.json({
        node_env: process.env.NODE_ENV,
        has_db_url: !!process.env.DATABASE_URL,
        // Do not return actual secrets!
    });
});

export default router;
