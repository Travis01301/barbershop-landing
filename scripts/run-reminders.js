#!/usr/bin/env node

// Standalone script to trigger appointment reminders
// Can be run via cron: 0 * * * * node scripts/run-reminders.js
// 
// Usage:
// - Direct: node scripts/run-reminders.js
// - Cron (hourly): 0 * * * * cd /path/to/project && node scripts/run-reminders.js
// - Cron (every 30 mins): every 30 minutes cd /path/to/project && node scripts/run-reminders.js

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.REMINDER_ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error('❌ Error: REMINDER_ADMIN_TOKEN environment variable not set');
  console.log('\nTo generate a token:');
  console.log('1. Run: npm run dev');
  console.log('2. POST to /api/auth/login with admin credentials');
  console.log('3. Copy accessToken and set REMINDER_ADMIN_TOKEN=<token>');
  process.exit(1);
}

console.log(`🔔 Triggering 24-hour appointment reminders...`);
console.log(`   API: ${API_URL}`);
console.log(`   Time: ${new Date().toISOString()}`);

const url = new URL('/api/reminders/send', API_URL);
const isHttps = url.protocol === 'https:';
const httpModule = isHttps ? require('https') : require('http');

const options = {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': 0,
  },
};

const req = httpModule.request(url, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      const result = JSON.parse(data);
      console.log('\n✅ Reminders executed successfully');
      console.log(`   Found: ${result.results.found}`);
      console.log(`   Sent: ${result.results.sent}`);
      console.log(`   Failed: ${result.results.failed}`);
      process.exit(0);
    } else {
      console.error(`\n❌ Failed (${res.statusCode})`);
      console.error(data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request error:', error.message);
  process.exit(1);
});

req.end();
