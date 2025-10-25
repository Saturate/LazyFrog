/**
 * Debug server for receiving logs from the LazyFrog extension
 * Now with SQLite3 for persistent storage across sessions!
 * Run with: node debug-server.js
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const app = express();
const PORT = 7856;

// Database setup
const DB_PATH = path.join(__dirname, 'debug-logs.db');
console.log(`📦 Database: ${DB_PATH}`);
const db = new Database(DB_PATH);
initDatabase();

/**
 * Initialize database schema
 */
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      context TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for faster queries
  db.exec('CREATE INDEX IF NOT EXISTS idx_context ON logs(context)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_level ON logs(level)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_timestamp ON logs(timestamp)');

  // Get log count
  const row = db.prepare('SELECT COUNT(*) as count FROM logs').get();
  console.log(`📊 Total logs in database: ${row.count}`);
}

// Middleware
app.use(express.json());

// CORS for localhost
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

/**
 * Log endpoint - receives logs from extension
 */
app.post('/log', (req, res) => {
  const { timestamp, context, level, message, data } = req.body;

  // Store log in database
  const dataStr = data !== undefined ? JSON.stringify(data) : null;
  try {
    const stmt = db.prepare('INSERT INTO logs (timestamp, context, level, message, data) VALUES (?, ?, ?, ?, ?)');
    stmt.run(timestamp, context, level, message, dataStr);
  } catch (err) {
    console.error('Error inserting log:', err);
  }

  // Color code by level
  const colors = {
    log: '\x1b[37m',     // White
    info: '\x1b[36m',    // Cyan
    warn: '\x1b[33m',    // Yellow
    error: '\x1b[31m',   // Red
    debug: '\x1b[35m',   // Magenta
  };
  const reset = '\x1b[0m';
  const color = colors[level] || colors.log;

  // Format timestamp (HH:MM:SS.mmm)
  const time = new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });

  // Print to console with colors
  console.log(`${color}[${time}] [${context}] [${level.toUpperCase()}] ${message}${reset}`);
  if (data !== undefined) {
    console.log(`${color}${JSON.stringify(data, null, 2)}${reset}`);
  }

  res.status(200).send('OK');
});

/**
 * Get recent logs
 */
app.get('/logs', (req, res) => {
  const { context, level, since, limit = '100' } = req.query;

  let query = 'SELECT * FROM logs WHERE 1=1';
  const params = [];

  // Filter by context
  if (context) {
    query += ' AND context = ?';
    params.push(context.toUpperCase());
  }

  // Filter by level
  if (level) {
    query += ' AND level = ?';
    params.push(level.toLowerCase());
  }

  // Filter by time
  if (since) {
    query += ' AND timestamp >= ?';
    params.push(since);
  }

  // Order by timestamp and limit
  query += ' ORDER BY id DESC LIMIT ?';
  params.push(parseInt(limit));

  try {
    const stmt = db.prepare(query);
    const rows = stmt.all(...params);

    // Parse data field back to JSON
    const logs = rows.reverse().map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      context: row.context,
      level: row.level,
      message: row.message,
      data: row.data ? JSON.parse(row.data) : undefined,
      created_at: row.created_at,
    }));

    res.json({
      total: logs.length,
      logs,
    });
  } catch (err) {
    console.error('Error querying logs:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Get logs summary
 */
app.get('/logs/summary', (req, res) => {
  try {
    const totalRow = db.prepare('SELECT COUNT(*) as total FROM logs').get();
    const contextRows = db.prepare('SELECT context, COUNT(*) as count FROM logs GROUP BY context').all();
    const levelRows = db.prepare('SELECT level, COUNT(*) as count FROM logs GROUP BY level').all();
    const timeRow = db.prepare('SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM logs').get();

    const summary = {
      total: totalRow.total,
      byContext: {},
      byLevel: {},
      oldest: timeRow.oldest,
      newest: timeRow.newest,
    };

    contextRows.forEach(row => {
      summary.byContext[row.context] = row.count;
    });

    levelRows.forEach(row => {
      summary.byLevel[row.level] = row.count;
    });

    res.json(summary);
  } catch (err) {
    console.error('Error getting summary:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Clear all logs
 */
app.post('/logs/clear', (req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM logs').get();
    const count = row.count;

    db.prepare('DELETE FROM logs').run();
    db.prepare('DELETE FROM sqlite_sequence WHERE name="logs"').run();

    res.json({ message: 'Logs cleared', count });
  } catch (err) {
    console.error('Error clearing logs:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Clear logs up to a certain ID (useful for cleaning up after viewing logs)
 */
app.post('/logs/clear-to-id', (req, res) => {
  try {
    const { maxId } = req.body;

    if (!maxId) {
      return res.status(400).json({ error: 'Missing maxId parameter' });
    }

    const row = db.prepare('SELECT COUNT(*) as count FROM logs WHERE id <= ?').get(maxId);
    const count = row.count;

    db.prepare('DELETE FROM logs WHERE id <= ?').run(maxId);

    res.json({ message: `Logs cleared up to ID ${maxId}`, count });
  } catch (err) {
    console.error('Error clearing logs:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Export logs to JSON file
 */
app.get('/logs/export', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM logs ORDER BY id').all();

    const logs = rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      context: row.context,
      level: row.level,
      message: row.message,
      data: row.data ? JSON.parse(row.data) : undefined,
      created_at: row.created_at,
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="debug-logs-export.json"');
    res.json(logs);
  } catch (err) {
    console.error('Error exporting logs:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Search logs by message text
 */
app.get('/logs/search', (req, res) => {
  const { q, limit = '100' } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  try {
    const stmt = db.prepare('SELECT * FROM logs WHERE message LIKE ? OR data LIKE ? ORDER BY id DESC LIMIT ?');
    const rows = stmt.all(`%${q}%`, `%${q}%`, parseInt(limit));

    const logs = rows.reverse().map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      context: row.context,
      level: row.level,
      message: row.message,
      data: row.data ? JSON.parse(row.data) : undefined,
      created_at: row.created_at,
    }));

    res.json({
      query: q,
      total: logs.length,
      logs,
    });
  } catch (err) {
    console.error('Error searching logs:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM logs').get();
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      logsStored: row.count,
      database: DB_PATH,
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 LazyFrog Debug Server (SQLite3)`);
  console.log(`   Listening on http://localhost:${PORT}`);
  console.log(`\n📍 Endpoints:`);
  console.log(`   POST /log                 - Receive logs from extension`);
  console.log(`   GET  /logs                - Get recent logs (query: context, level, since, limit)`);
  console.log(`   GET  /logs/summary        - Get logs summary`);
  console.log(`   GET  /logs/search         - Search logs by text (query: q, limit)`);
  console.log(`   GET  /logs/export         - Export all logs as JSON file`);
  console.log(`   POST /logs/clear          - Clear all logs`);
  console.log(`   POST /logs/clear-to-id    - Clear logs up to ID (body: {maxId: 12345})`);
  console.log(`   GET  /health              - Health check`);
  console.log(`\n💡 Usage:`);
  console.log(`   curl http://localhost:${PORT}/logs?context=REDDIT&limit=10`);
  console.log(`   curl http://localhost:${PORT}/logs/summary`);
  console.log(`   curl http://localhost:${PORT}/logs/search?q=mission`);
  console.log(`   curl http://localhost:${PORT}/logs/export -o logs.json`);
  console.log(`   curl -X POST http://localhost:${PORT}/logs/clear`);
  console.log(`   curl -X POST http://localhost:${PORT}/logs/clear-to-id -H "Content-Type: application/json" -d '{"maxId": 12345}'`);
  console.log(`\n⏳ Waiting for logs...\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  db.close();
  console.log('✅ Database closed');
  process.exit(0);
});
