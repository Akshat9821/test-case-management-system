import express from 'express';
import pool from '../db/connection';

const router = express.Router();

router.get('/db-check', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();

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
