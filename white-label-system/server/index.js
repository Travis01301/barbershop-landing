const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multi-tenant middleware
app.use(require('./middleware/multiTenant'));
app.use(require('./middleware/auth'));

// Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/organizations/:orgId/settings', require('./routes/settings'));
app.use('/api/organizations/:orgId/shops', require('./routes/shops'));
app.use('/api/organizations/:orgId/staff', require('./routes/staff'));
app.use('/api/organizations/:orgId/billing', require('./routes/billing'));
app.use('/api/organizations/:orgId/analytics', require('./routes/analytics'));
app.use('/api/auth', require('./routes/auth'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  
  if (err.type === 'MULTI_TENANT_ERROR') {
    return res.status(400).json({ error: err.message });
  }
  
  if (err.type === 'AUTH_ERROR') {
    return res.status(401).json({ error: err.message });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 White-Label Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = { app, prisma };
