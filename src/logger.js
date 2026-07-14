'use strict';

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'send-attempts.log');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Append a structured log entry for every maintenance send attempt.
 * @param {object} entry
 */
function logSendAttempt(entry) {
  ensureLogDir();

  const record = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  const line = `${JSON.stringify(record)}\n`;
  fs.appendFileSync(LOG_FILE, line, 'utf8');

  // Also emit to stdout for platform log aggregation (Render, etc.)
  console.log('[send-attempt]', JSON.stringify(record));
}

function info(message, meta = {}) {
  console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
}

function error(message, meta = {}) {
  console.error(JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() }));
}

module.exports = {
  logSendAttempt,
  info,
  error,
};
