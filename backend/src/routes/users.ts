import express from 'express';
import pool from '../db/connection';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { sanitizeInput } from '../middleware/validation';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role (admin only)
router.put('/:id/role', authenticate, authorize('admin'), sanitizeInput, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['admin', 'test-lead', 'tester', 'read-only'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role',
      [role, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;






