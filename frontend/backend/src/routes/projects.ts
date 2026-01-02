import express, { Response } from 'express';
import pool from '../db/connection';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validateProject, handleValidationErrors, sanitizeInput } from '../middleware/validation';
import { invalidateCache } from '../middleware/cache';

const router = express.Router();

// Get all projects (accessible to all authenticated users)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Get projects where user is a member or is admin/test-lead
    const result = await pool.query(
      `SELECT DISTINCT p.*, u.name as created_by_name
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN users u ON p.created_by = u.id
       WHERE pm.user_id = $1 OR $2 IN ('admin', 'test-lead')
       ORDER BY p.created_at DESC`,
      [userId, req.user!.role]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    const result = await pool.query(
      `SELECT p.*, u.name as created_by_name,
       (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1 AND (
         EXISTS (SELECT 1 FROM project_members WHERE project_id = p.id AND user_id = $2)
         OR $3 IN ('admin', 'test-lead')
       )`,
      [id, userId, req.user!.role]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get project members
    const members = await pool.query(
      `SELECT u.id, u.email, u.name, u.role
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1`,
      [id]
    );
    
    res.json({ ...result.rows[0], members: members.rows });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create project (admin and test-lead only)
router.post(
  '/',
  authenticate,
  authorize('admin', 'test-lead'),
  sanitizeInput,
  validateProject,
  handleValidationErrors,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, version, status = 'active' } = req.body;
      const createdBy = req.user!.id;
      
      const result = await pool.query(
        'INSERT INTO projects (name, description, version, status, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, description, version, status, createdBy]
      );
      
      // Add creator as project member
      await pool.query('INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)', [
        result.rows[0].id,
        createdBy,
      ]);
      
      await invalidateCache('/api/projects');
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update project (admin and test-lead only)
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'test-lead'),
  sanitizeInput,
  validateProject,
  handleValidationErrors,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, version, status } = req.body;
      
      const result = await pool.query(
        'UPDATE projects SET name = $1, description = $2, version = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
        [name, description, version, status, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      await invalidateCache('/api/projects');
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Add member to project (admin and test-lead only)
router.post(
  '/:id/members',
  authenticate,
  authorize('admin', 'test-lead'),
  sanitizeInput,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { user_id } = req.body;
      
      await pool.query('INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
        id,
        user_id,
      ]);
      
      await invalidateCache('/api/projects');
      
      res.status(201).json({ message: 'Member added successfully' });
    } catch (error) {
      console.error('Error adding member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Remove member from project (admin and test-lead only)
router.delete(
  '/:id/members/:userId',
  authenticate,
  authorize('admin', 'test-lead'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, userId } = req.params;
      
      await pool.query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [id, userId]);
      
      await invalidateCache('/api/projects');
      
      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

