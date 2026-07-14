'use strict';

const { App, ExpressReceiver } = require('@slack/bolt');
const config = require('./config');
const { isAllowedUser } = require('./auth');
const { logSendAttempt, info, error } = require('./logger');
const {
  buildMaintenanceModal,
  buildAnnouncementBlocks,
  buildPreviewBlocks,
  extractModalValues,
} = require('./blocks');

const receiver = new ExpressReceiver({
  signingSecret: config.slackSigningSecret,
  endpoints: '/slack/events',
});

const app = new App({
  token: config.slackBotToken,
  receiver,
});

// Health check for Render and load balancers
receiver.app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'slack-maintenance-bot',
    timestamp: new Date().toISOString(),
  });
});

/**
 * /maintenance — open the announcement modal (allowed users only)
 */
app.command('/maintenance', async ({ command, ack, client, respond }) => {
  await ack();

  if (!isAllowedUser(command.user_id)) {
    await respond({
      response_type: 'ephemeral',
      text: 'You are not authorized to use `/maintenance`. Ask an admin to add your user ID to `allowed-users.json`.',
    });
    return;
  }

  try {
    const view = buildMaintenanceModal();
    // Carry the invoking channel so the preview can be posted ephemerally there
    view.private_metadata = JSON.stringify({ channelId: command.channel_id });

    await client.views.open({
      trigger_id: command.trigger_id,
      view,
    });
  } catch (err) {
    error('Failed to open maintenance modal', {
      userId: command.user_id,
      error: err.message,
    });
    await respond({
      response_type: 'ephemeral',
      text: 'Could not open the maintenance form. Please try again.',
    });
  }
});

/**
 * Deliver a message only to the requester (ephemeral in channel, else DM)
 */
async function notifyRequester(client, { channelId, userId, text, blocks }) {
  if (channelId) {
    try {
      await client.chat.postEphemeral({
        channel: channelId,
        user: userId,
        text,
        blocks,
      });
      return;
    } catch (err) {
      error('Ephemeral preview failed, falling back to DM', {
        userId,
        channelId,
        error: err.message,
      });
    }
  }

  const dm = await client.conversations.open({ users: userId });
  await client.chat.postMessage({
    channel: dm.channel.id,
    text,
    blocks,
  });
}

/**
 * Modal submit — show ephemeral preview with Send / Cancel
 */
app.view('maintenance_modal', async ({ ack, body, view, client }) => {
  await ack();

  let meta = {};
  try {
    meta = view.private_metadata ? JSON.parse(view.private_metadata) : {};
  } catch {
    meta = {};
  }

  const channelId = meta.channelId;
  const userId = body.user.id;

  if (!isAllowedUser(userId)) {
    await notifyRequester(client, {
      channelId,
      userId,
      text: 'You are not authorized to submit maintenance announcements.',
    });
    return;
  }

  const values = extractModalValues(view.state.values);
  const payload = {
    ...values,
    requesterId: userId,
  };

  // Button value max is 2000 chars; keep payload compact
  const buttonValue = JSON.stringify(payload);

  if (buttonValue.length > 2000) {
    await notifyRequester(client, {
      channelId,
      userId,
      text: 'Announcement content is too long for a preview. Shorten the impact or custom message and try again.',
    });
    return;
  }

  await notifyRequester(client, {
    channelId,
    userId,
    text: 'Maintenance announcement preview',
    blocks: buildPreviewBlocks(payload, buttonValue),
  });
});

/**
 * Send — broadcast to every channel in channels.json
 */
app.action('maintenance_send', async ({ ack, body, action, client, respond }) => {
  await ack();

  const userId = body.user.id;

  if (!isAllowedUser(userId)) {
    await respond({
      replace_original: true,
      text: 'You are not authorized to send maintenance announcements.',
    });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(action.value);
  } catch (err) {
    error('Invalid send payload', { userId, error: err.message });
    await respond({
      replace_original: true,
      text: 'Could not parse announcement data. Please run `/maintenance` again.',
    });
    return;
  }

  const channels = config.channels;
  const results = [];
  const blocks = buildAnnouncementBlocks(payload);
  const fallbackText = `Maintenance: ${payload.title} (${payload.window})`;

  for (const channelId of channels) {
    const attempt = {
      userId,
      channelId,
      title: payload.title,
      announcementType: payload.announcementType,
      success: false,
    };

    try {
      const result = await client.chat.postMessage({
        channel: channelId,
        text: fallbackText,
        blocks,
      });
      attempt.success = true;
      attempt.ts = result.ts;
      results.push(attempt);
      logSendAttempt(attempt);
    } catch (err) {
      attempt.success = false;
      attempt.error = err.message;
      results.push(attempt);
      logSendAttempt(attempt);
      error('Failed to post maintenance announcement', attempt);
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);

  let summary = `Sent maintenance announcement to *${succeeded}* of *${channels.length}* channel(s).`;
  if (failed.length > 0) {
    summary += `\nFailed: ${failed.map((f) => `<#${f.channelId}> (${f.error})`).join(', ')}`;
  }

  info('Maintenance broadcast complete', {
    userId,
    succeeded,
    failed: failed.length,
    title: payload.title,
  });

  await respond({
    replace_original: true,
    text: summary,
  });
});

/**
 * Cancel — discard the preview
 */
app.action('maintenance_cancel', async ({ ack, respond }) => {
  await ack();
  await respond({
    replace_original: true,
    text: 'Maintenance announcement cancelled. Nothing was posted.',
  });
});

(async () => {
  await app.start(config.port);
  info('slack-maintenance-bot is running', {
    port: config.port,
    env: config.nodeEnv,
    channels: config.channels.length,
    allowedUsers: config.allowedUsers.length,
  });
})().catch((err) => {
  error('Failed to start app', { error: err.message });
  process.exit(1);
});
