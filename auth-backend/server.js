const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again in 15 minutes' }
});

app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/auth/refresh', authLimiter);

const JWT_SECRET = 'my-secret-key';

// Base de dados SQLite
const db = new Database('database.db');

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    assigned_to INTEGER,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  )
`);

/**
 * SWAGGER CONFIGURATION
 */

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth API',
      version: '1.0.0',
      description: 'Simple authentication API with Node.js, Express.js and JWT'
    },
    servers: [
      {
        url: 'http://localhost:3000'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * AUTH MIDDLEWARE
 */

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: 'Token not provided'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        message: 'Invalid or expired token'
      });
    }

    req.user = user;

    next();
  });
}

/**
 * @swagger
 * /:
 *   get:
 *     summary: Check if the API is running
 *     responses:
 *       200:
 *         description: API is running
 */

app.get('/', (req, res) => {
  res.send('Auth API is running');
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Create a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ash
 *               email:
 *                 type: string
 *                 example: ash@test.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: User already exists
 */

app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: 'Name, email and password are required'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters'
    });
  }

  const userAlreadyExists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

  if (userAlreadyExists) {
    return res.status(409).json({
      message: 'User already exists'
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hashedPassword);

  res.status(201).json({
    message: 'User created successfully'
  });
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: ash@test.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 */

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password are required'
    });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    return res.status(401).json({
      message: 'Invalid credentials'
    });
  }

  const passwordIsValid = await bcrypt.compare(password, user.password);

  if (!passwordIsValid) {
    return res.status(401).json({
      message: 'Invalid credentials'
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: '15m'
    }
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');
  db.prepare('INSERT INTO refresh_tokens (user_id, token) VALUES (?, ?)').run(user.id, refreshToken);

  res.json({
    message: 'Login successful',
    token,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get authenticated user information
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information returned successfully
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Invalid or expired token
 */

app.get('/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({
    message: 'Protected data',
    user
  });
});

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ash Ketchum
 *               email:
 *                 type: string
 *                 example: ash@test.com
 *               password:
 *                 type: string
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: No fields provided or invalid data
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Invalid or expired token
 *       409:
 *         description: Email already in use by another account
 */

app.put('/auth/profile', authenticateToken, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name && !email && !password) {
    return res.status(400).json({
      message: 'At least one field (name, email or password) is required'
    });
  }

  if (email) {
    const emailInUse = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
    if (emailInUse) {
      return res.status(409).json({
        message: 'Email already in use by another account'
      });
    }
  }

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!current) {
    return res.status(404).json({ message: 'User not found' });
  }

  const newName = name ?? current.name;
  const newEmail = email ?? current.email;

  if (password && password.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters'
    });
  }

  const newPassword = password ? await bcrypt.hash(password, 10) : current.password;

  db.prepare('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?')
    .run(newName, newEmail, newPassword, req.user.id);

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: current.id,
      name: newName,
      email: newEmail
    }
  });
});

/**
 * @swagger
 * /auth/profile:
 *   delete:
 *     summary: Delete authenticated user account
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Invalid or expired token
 *       404:
 *         description: User not found
 */

app.delete('/auth/profile', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.user.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  res.json({ message: 'Account deleted successfully' });
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Get a new access token using a refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Refresh token missing
 *       403:
 *         description: Invalid refresh token
 */

app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }
  const stored = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(refreshToken);
  if (!stored) {
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(stored.user_id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const accessToken = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  res.json({ accessToken, user });
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Invalidate the refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 */

app.post('/auth/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
  }
  res.json({ message: 'Logged out successfully' });
});

// ── TASKS ──────────────────────────────────────────────────────────────────

app.post('/tasks', authenticateToken, (req, res) => {
  const { title, description, status, priority } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  const validStatuses   = ['pending', 'in_progress', 'done'];
  const validPriorities = ['low', 'medium', 'high'];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ message: 'Invalid priority' });
  }

  const result = db.prepare(
    'INSERT INTO tasks (title, description, status, priority, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(title, description || null, status || 'pending', priority || 'medium', req.user.id);

  res.status(201).json({ message: 'Task created', id: result.lastInsertRowid });
});

app.get('/tasks', authenticateToken, (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;
  const search = req.query.search ? `%${req.query.search}%` : '%';
  const status = req.query.status || null;

  const allowedSort  = ['title', 'status', 'priority', 'created_at'];
  const allowedOrder = ['ASC', 'DESC'];
  const sort  = allowedSort.includes(req.query.sort) ? req.query.sort : 'created_at';
  const order = allowedOrder.includes(req.query.order?.toUpperCase()) ? req.query.order.toUpperCase() : 'DESC';

  let where  = 'WHERE t.created_by = ? AND t.title LIKE ?';
  let params = [req.user.id, search];

  if (status) {
    where += ' AND t.status = ?';
    params.push(status);
  }

  const total = db.prepare(
    `SELECT COUNT(*) as count FROM tasks t ${where}`
  ).get(...params).count;

  const tasks = db.prepare(
    `SELECT t.*, u.name as assigned_to_name
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     ${where}
     ORDER BY t.${sort} ${order}
     LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  res.json({
    data: tasks,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
  });
});

app.put('/tasks/:id', authenticateToken, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND created_by = ?')
    .get(req.params.id, req.user.id);

  if (!task) return res.status(404).json({ message: 'Task not found' });

  const { title, description, status, priority } = req.body;
  const validStatuses   = ['pending', 'in_progress', 'done'];
  const validPriorities = ['low', 'medium', 'high'];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ message: 'Invalid priority' });
  }

  db.prepare(
    'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ? WHERE id = ?'
  ).run(
    title       ?? task.title,
    description ?? task.description,
    status      ?? task.status,
    priority    ?? task.priority,
    task.id
  );

  res.json({ message: 'Task updated' });
});

app.delete('/tasks/:id', authenticateToken, (req, res) => {
  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND created_by = ?')
    .get(req.params.id, req.user.id);

  if (!task) return res.status(404).json({ message: 'Task not found' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
  res.json({ message: 'Task deleted' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
