require('dotenv').config();
const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

// Connection pool to AWS RDS MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000,
});

// ---- Static frontend files ----
const file = (name) => (req, res) => res.sendFile(path.join(__dirname, name));
app.get('/', file('index.html'));
app.get('/style.css', file('style.css'));
app.get('/app.js', file('app.js'));

// ---- Helpers ----
function validate(body) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const department = String(body.department || '').trim();
  const salary = Number(body.salary);
  if (!name || !email || !department) return { error: 'Name, email and department are required.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Invalid email address.' };
  if (!Number.isFinite(salary) || salary < 0) return { error: 'Salary must be a positive number.' };
  return { value: { name, email, department, salary } };
}

function handleError(res, err) {
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists.' });
  console.error(err);
  res.status(500).json({ error: 'Database error: ' + (err.code || err.message) });
}

// ---- API ----
// Health check (tests the RDS connection)
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.code || err.message });
  }
});

// READ all (with optional ?search=)
app.get('/api/employees', async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    let rows;
    if (search) {
      const like = `%${search}%`;
      [rows] = await pool.query(
        'SELECT * FROM employees WHERE name LIKE ? OR email LIKE ? OR department LIKE ? ORDER BY id DESC',
        [like, like, like]
      );
    } else {
      [rows] = await pool.query('SELECT * FROM employees ORDER BY id DESC');
    }
    res.json(rows);
  } catch (err) {
    handleError(res, err);
  }
});

// READ one
app.get('/api/employees/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found.' });
    res.json(rows[0]);
  } catch (err) {
    handleError(res, err);
  }
});

// CREATE
app.post('/api/employees', async (req, res) => {
  const { error, value } = validate(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const [result] = await pool.query(
      'INSERT INTO employees (name, email, department, salary) VALUES (?, ?, ?, ?)',
      [value.name, value.email, value.department, value.salary]
    );
    res.status(201).json({ id: result.insertId, ...value });
  } catch (err) {
    handleError(res, err);
  }
});

// UPDATE
app.put('/api/employees/:id', async (req, res) => {
  const { error, value } = validate(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const [result] = await pool.query(
      'UPDATE employees SET name = ?, email = ?, department = ?, salary = ? WHERE id = ?',
      [value.name, value.email, value.department, value.salary, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found.' });
    res.json({ id: Number(req.params.id), ...value });
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Deleted.' });
  } catch (err) {
    handleError(res, err);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
