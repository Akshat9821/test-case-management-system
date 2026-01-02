import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.json({
        node_env: process.env.NODE_ENV,
        has_db_host: !!process.env.DB_HOST,
        has_db_user: !!process.env.DB_USER,
        has_db_pass: !!process.env.DB_PASSWORD,
        has_jwt_secret: !!process.env.JWT_SECRET,
        has_redis_url: !!process.env.REDIS_URL,
        db_host_preview: process.env.DB_HOST ? process.env.DB_HOST.substring(0, 5) + '...' : 'missing',
    });
}
