const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Multi-tenant middleware
 * Identifies organization by:
 * 1. Custom domain (e.g., mybarbershop.com)
 * 2. Subdomain (e.g., acme.barbershop.com)
 * 3. Query param (?org=acme)
 * 4. Header (X-Organization-ID)
 */
async function multiTenantMiddleware(req, res, next) {
  try {
    let organization = null;
    const host = req.get('host');
    const subdomain = extractSubdomain(host);
    const orgFromQuery = req.query.org;
    const orgFromHeader = req.get('X-Organization-ID');
    
    // 1. Try custom domain
    if (host && !isLocalhost(host)) {
      organization = await prisma.organizationSettings.findUnique({
        where: { customDomain: host },
        include: { organization: true },
      });
    }
    
    // 2. Try subdomain
    if (!organization && subdomain && subdomain !== 'www') {
      organization = await prisma.organizationSettings.findUnique({
        where: { customDomain: `${subdomain}.barbershop.com` },
        include: { organization: true },
      });
      
      if (!organization) {
        // Try finding by subdomain as org slug
        const org = await prisma.organization.findFirst({
          where: { email: { contains: `${subdomain}@` } },
          include: { settings: true },
        });
        organization = org?.settings || null;
      }
    }
    
    // 3. Try query parameter
    if (!organization && orgFromQuery) {
      const org = await prisma.organization.findUnique({
        where: { id: orgFromQuery },
        include: { settings: true },
      });
      organization = org?.settings || null;
    }
    
    // 4. Try header
    if (!organization && orgFromHeader) {
      const org = await prisma.organization.findUnique({
        where: { id: orgFromHeader },
        include: { settings: true },
      });
      organization = org?.settings || null;
    }
    
    // Attach to request
    if (organization) {
      req.organization = organization.organization;
      req.organizationSettings = organization;
    }
    
    next();
  } catch (error) {
    console.error('Multi-tenant middleware error:', error);
    next(error);
  }
}

/**
 * Middleware that requires a valid organization context
 */
function requireOrganization(req, res, next) {
  if (!req.organization) {
    const error = new Error('Organization not found or not configured');
    error.type = 'MULTI_TENANT_ERROR';
    return next(error);
  }
  next();
}

/**
 * Extract subdomain from host
 * mybarbershop.com => null
 * acme.barbershop.com => acme
 * localhost:3000 => null
 */
function extractSubdomain(host) {
  if (!host) return null;
  
  const parts = host.split('.');
  
  // localhost or IP
  if (parts.length === 1 || host.includes('localhost')) {
    return null;
  }
  
  // Single dot (example.com) - no subdomain
  if (parts.length === 2) {
    return null;
  }
  
  // Multiple dots - return first part as subdomain
  return parts[0];
}

function isLocalhost(host) {
  return host?.includes('localhost') || host?.includes('127.0.0.1');
}

module.exports = multiTenantMiddleware;
module.exports.requireOrganization = requireOrganization;
module.exports.extractSubdomain = extractSubdomain;
