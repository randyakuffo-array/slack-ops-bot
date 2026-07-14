'use strict';

const config = require('./config');

/**
 * @param {string} userId Slack user ID
 * @returns {boolean}
 */
function isAllowedUser(userId) {
  return config.allowedUsers.includes(userId);
}

module.exports = {
  isAllowedUser,
};
