/**
 * Simple debug server for receiving logs from the AutoSupper extension
 * Run with: node debug-server.js
 */

const express = require('express');
const app = express();
const PORT = 7856;

// Store logs in memory (for AI integration later)
const logs = [];
const MAX_LOGS = 1000; // Keep last 1000 logs

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

  // Store log
  logs.push(req.body);
  if (logs.length > MAX_LOGS) {
    logs.shift(); // Remove oldest log
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
  const dataStr = data !== undefined ? JSON.stringify(data, null, 2) : '';
  console.log(`${color}[${time}] [${context}] [${level.toUpperCase()}] ${message}${reset}`);
  if (dataStr) {
    console.log(`${color}${dataStr}${reset}`);
  }

  res.status(200).send('OK');
});

/**
 * Get recent logs (for AI integration)
 */
app.get('/logs', (req, res) => {
  const { context, level, since, limit } = req.query;

  let filtered = logs;

  // Filter by context
  if (context) {
    filtered = filtered.filter(log => log.context === context.toUpperCase());
  }

  // Filter by level
  if (level) {
    filtered = filtered.filter(log => log.level === level.toLowerCase());
  }

  // Filter by time
  if (since) {
    const sinceTime = new Date(since).getTime();
    filtered = filtered.filter(log => new Date(log.timestamp).getTime() >= sinceTime);
  }

  // Limit results
  const maxLimit = parseInt(limit) || 100;
  filtered = filtered.slice(-maxLimit);

  res.json({
    total: filtered.length,
    logs: filtered,
  });
});

/**
 * Get logs summary
 */
app.get('/logs/summary', (req, res) => {
  const summary = {
    total: logs.length,
    byContext: {},
    byLevel: {},
    oldest: logs[0]?.timestamp,
    newest: logs[logs.length - 1]?.timestamp,
  };

  logs.forEach(log => {
    // Count by context
    summary.byContext[log.context] = (summary.byContext[log.context] || 0) + 1;

    // Count by level
    summary.byLevel[log.level] = (summary.byLevel[log.level] || 0) + 1;
  });

  res.json(summary);
});

/**
 * Clear all logs
 */
app.post('/logs/clear', (req, res) => {
  const count = logs.length;
  logs.length = 0;
  res.json({ message: 'Logs cleared', count });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    logsStored: logs.length,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 AutoSupper Debug Server`);
  console.log(`   Listening on http://localhost:${PORT}`);
  console.log(`\n📍 Endpoints:`);
  console.log(`   POST /log              - Receive logs from extension`);
  console.log(`   GET  /logs             - Get recent logs (query: context, level, since, limit)`);
  console.log(`   GET  /logs/summary     - Get logs summary`);
  console.log(`   POST /logs/clear       - Clear all logs`);
  console.log(`   GET  /health           - Health check`);
  console.log(`\n💡 Usage:`);
  console.log(`   curl http://localhost:${PORT}/logs?context=REDDIT&limit=10`);
  console.log(`   curl http://localhost:${PORT}/logs/summary`);
  console.log(`   curl -X POST http://localhost:${PORT}/logs/clear`);
  console.log(`\n📝 Note: Port ${PORT} chosen.`);
  console.log(`\n⏳ Waiting for logs...\n`);
});
