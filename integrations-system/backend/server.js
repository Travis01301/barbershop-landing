// Advanced Integrations System - Main Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');
const { createServer } = require('http');

const app = express();

// Database Connection Pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
const integrationRoutes = require('./routes/integrations');
const oauthRoutes = require('./routes/oauth');
const webhookRoutes = require('./routes/webhooks');
const syncRoutes = require('./routes/sync');
const logsRoutes = require('./routes/logs');

app.use('/api/integrations', integrationRoutes(pool));
app.use('/api/oauth', oauthRoutes(pool));
app.use('/api/webhooks', webhookRoutes(pool));
app.use('/api/sync', syncRoutes(pool));
app.use('/api/logs', logsRoutes(pool));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    error: true,
    message,
    code: err.code || 'UNKNOWN_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: 'Route not found',
    path: req.path,
  });
});

// Graceful shutdown
const server = createServer(app);
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Integrations API running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

module.exports = { app, pool };
