'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  // Trim — trailing newlines/spaces from Render paste are a common invalid_auth cause
  return String(value).trim();
}

function loadJson(filename) {
  const filepath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Missing required config file: ${filename}`);
  }
  const raw = fs.readFileSync(filepath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${filename} must be a JSON array`);
  }
  return parsed;
}

const slackBotToken = requireEnv('SLACK_BOT_TOKEN');
const slackSigningSecret = requireEnv('SLACK_SIGNING_SECRET');

if (!slackBotToken.startsWith('xoxb-')) {
  throw new Error(
    'SLACK_BOT_TOKEN must be a Bot User OAuth Token starting with xoxb- (not a signing secret, app-level token, or user token)',
  );
}

const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  slackBotToken,
  slackSigningSecret,
  channels: loadJson('channels.json'),
  allowedUsers: loadJson('allowed-users.json'),
};

module.exports = config;
