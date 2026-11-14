const express = require('express');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;





app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
