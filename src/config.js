'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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

const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  slackBotToken: requireEnv('SLACK_BOT_TOKEN'),
  slackSigningSecret: requireEnv('SLACK_SIGNING_SECRET'),
  channels: loadJson('channels.json'),
  allowedUsers: loadJson('allowed-users.json'),
};

module.exports = config;
