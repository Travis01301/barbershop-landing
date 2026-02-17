const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/register
 * Create new user account
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, name, password, organizationId } = req.body;
    
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        organizationId: organizationId || 'default',
      },
    });
    
    const token = generateToken(user.id, user.organizationId, 'STAFF');
    
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    next(error);
  }
});

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: { staff: true },
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is disabled' });
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    
    const role = user.staff?.role || 'STAFF';
    const token = generateToken(user.id, user.organizationId, role);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        role,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/verify
 * Verify JWT token
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { staff: true },
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        role: user.staff?.role || 'STAFF',
      },
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
    } catch (err) {
      // Token expired, try to decode without verification
      decoded = jwt.decode(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { staff: true },
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const role = user.staff?.role || 'STAFF';
    const newToken = generateToken(user.id, user.organizationId, role);
    
    res.json({ token: newToken });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/password-reset
 * Request password reset
 */
router.post('/password-reset', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (user) {
      const token = uuidv4();
      // In production, send email with reset link
      // For now, just return the token
    }
    
    // Always return success to prevent email enumeration
    res.json({ success: true, message: 'If email exists, reset link will be sent' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
