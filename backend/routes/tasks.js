const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const STATUSES = ['todo', 'doing', 'done'];

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, description, status, created_at FROM tasks WHERE user_id = $1 ORDER BY id DESC',
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('List tasks failed:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  const { title, description = null, status = 'todo' } = req.body ?? {};

  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ message: 'Title is required' });
  }
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Status must be todo, doing or done' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO tasks (user_id, title, description, status) VALUES ($1, $2, $3, $4) RETURNING id, title, description, status, created_at',
      [req.user.id, title.trim(), description, status]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create task failed:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }

  const { title, description, status } = req.body ?? {};
  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({ message: 'Invalid title' });
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Status must be todo, doing or done' });
  }

  try {
    const result = await pool.query(
      `UPDATE tasks
          SET title = COALESCE($1, title),
              description = COALESCE($2, description),
              status = COALESCE($3, status)
        WHERE id = $4 AND user_id = $5
        RETURNING id, title, description, status, created_at`,
      [title?.trim() ?? null, description ?? null, status ?? null, id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update task failed:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Delete task failed:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
