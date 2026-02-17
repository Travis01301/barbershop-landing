const jwt = require('jsonwebtoken');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
function authMiddleware(req, res, next) {
  const publicRoutes = [
    '/api/health',
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/verify',
  ];
  
  // Skip auth for public routes
  if (publicRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }
  
  const token = extractToken(req);
  
  if (!token) {
    const error = new Error('No authorization token provided');
    error.type = 'AUTH_ERROR';
    return next(error);
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    const err = new Error('Invalid or expired token');
    err.type = 'AUTH_ERROR';
    next(err);
  }
}

/**
 * Require organization admin
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    const error = new Error('User not authenticated');
    error.type = 'AUTH_ERROR';
    return next(error);
  }
  
  if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
    const error = new Error('Admin role required');
    error.type = 'AUTH_ERROR';
    error.status = 403;
    return next(error);
  }
  
  next();
}

/**
 * Extract JWT from request
 * Supports: Authorization header, Cookie
 */
function extractToken(req) {
  // Authorization header
  const authHeader = req.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  // Cookie
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  
  return null;
}

/**
 * Generate JWT token
 */
function generateToken(userId, organizationId, role) {
  return jwt.sign(
    {
      userId,
      organizationId,
      role,
    },
    process.env.JWT_SECRET || 'secret-key',
    { expiresIn: '7d' }
  );
}

module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
module.exports.generateToken = generateToken;
module.exports.extractToken = extractToken;
