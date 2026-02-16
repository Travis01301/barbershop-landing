// Mock for jose ESM module for Jest testing

const jwt = require('jsonwebtoken');

// Helper to parse duration strings like '15m', '7d'
function parseDuration(duration) {
  if (typeof duration === 'number') return duration;
  if (!duration || typeof duration !== 'string') return 900; // Default 15 minutes
  
  const match = duration.match(/^(\d+)([mhdsy])$/);
  if (!match) return 900;
  
  const [, value, unit] = match;
  const num = parseInt(value, 10);
  
  const multipliers = {
    's': 1,
    'm': 60,
    'h': 3600,
    'd': 86400,
    'y': 31536000,
  };
  
  return num * (multipliers[unit] || 1);
}

const SignJWT = class {
  constructor(payload) {
    this.payload = payload;
  }

  setProtectedHeader(header) {
    this.header = header;
    return this;
  }

  setIssuedAt() {
    this.iat = Math.floor(Date.now() / 1000);
    return this;
  }

  setExpirationTime(expiresIn) {
    // expiresIn is a duration string like '15m', '7d', or a number of seconds
    const seconds = parseDuration(expiresIn);
    this.exp = Math.floor(Date.now() / 1000) + seconds;
    return this;
  }

  async sign(secret) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      ...this.payload,
      iat: this.iat || now,
      exp: this.exp || now + 900, // Default 15 min
    };
    
    // Convert secret from Uint8Array to string if needed
    let secretStr = secret;
    if (secret instanceof Uint8Array || Buffer.isBuffer(secret)) {
      secretStr = secret.toString('utf-8');
    }
    
    return jwt.sign(payload, secretStr);
  }
};

const jwtVerify = async (token, secret) => {
  try {
    // Convert secret from Uint8Array to string if needed
    let secretStr = secret;
    if (secret instanceof Uint8Array || Buffer.isBuffer(secret)) {
      secretStr = secret.toString('utf-8');
    }
    
    const decoded = jwt.verify(token, secretStr);
    return { payload: decoded };
  } catch (error) {
    throw error;
  }
};

const compactDecrypt = async (token, secret) => {
  try {
    // Convert secret from Uint8Array to string if needed
    let secretStr = secret;
    if (secret instanceof Uint8Array || Buffer.isBuffer(secret)) {
      secretStr = secret.toString('utf-8');
    }
    
    const decoded = jwt.verify(token, secretStr);
    return { plaintext: JSON.stringify(decoded) };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  SignJWT,
  jwtVerify,
  compactDecrypt,
};
