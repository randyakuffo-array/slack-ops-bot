'use strict';

const config = require('./config');

/**
 * @param {string} userId Slack user ID
 * @returns {boolean}
 */
function isAllowedUser(userId) {
  // "*" opens /maintenance to everyone in the workspace
  if (config.allowedUsers.includes('*')) {
    return true;
  }
  return config.allowedUsers.includes(userId);
}

module.exports = {
  isAllowedUser,
};
