'use strict';

const ANNOUNCEMENT_TYPES = {
  scheduled: { label: 'Scheduled', emoji: ':calendar:' },
  emergency: { label: 'Emergency', emoji: ':rotating_light:' },
  completed: { label: 'Completed', emoji: ':white_check_mark:' },
};

/**
 * Modal opened by /maintenance
 */
function buildMaintenanceModal() {
  return {
    type: 'modal',
    callback_id: 'maintenance_modal',
    title: {
      type: 'plain_text',
      text: 'Maintenance Announcement',
    },
    submit: {
      type: 'plain_text',
      text: 'Preview',
    },
    close: {
      type: 'plain_text',
      text: 'Cancel',
    },
    blocks: [
      {
        type: 'input',
        block_id: 'title_block',
        label: { type: 'plain_text', text: 'Title' },
        element: {
          type: 'plain_text_input',
          action_id: 'title',
          placeholder: { type: 'plain_text', text: 'e.g. API platform maintenance' },
          max_length: 150,
        },
      },
      {
        type: 'input',
        block_id: 'window_block',
        label: { type: 'plain_text', text: 'Maintenance window' },
        element: {
          type: 'plain_text_input',
          action_id: 'window',
          placeholder: {
            type: 'plain_text',
            text: 'e.g. Jul 14, 2026 10:00–12:00 UTC',
          },
          max_length: 200,
        },
      },
      {
        type: 'input',
        block_id: 'impact_block',
        label: { type: 'plain_text', text: 'Impact' },
        element: {
          type: 'plain_text_input',
          action_id: 'impact',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'Describe what users should expect during the window',
          },
          max_length: 2000,
        },
      },
      {
        type: 'input',
        block_id: 'message_block',
        label: { type: 'plain_text', text: 'Custom message' },
        element: {
          type: 'plain_text_input',
          action_id: 'custom_message',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'Additional context, workarounds, or contact info',
          },
          max_length: 2000,
        },
      },
      {
        type: 'input',
        block_id: 'type_block',
        label: { type: 'plain_text', text: 'Announcement type' },
        element: {
          type: 'static_select',
          action_id: 'announcement_type',
          placeholder: { type: 'plain_text', text: 'Select a type' },
          options: Object.entries(ANNOUNCEMENT_TYPES).map(([value, meta]) => ({
            text: {
              type: 'plain_text',
              text: `${meta.emoji} ${meta.label}`,
            },
            value,
          })),
        },
      },
    ],
  };
}

/**
 * Public channel announcement blocks
 * @param {object} payload
 * @param {string} payload.title
 * @param {string} payload.window
 * @param {string} payload.impact
 * @param {string} payload.customMessage
 * @param {string} payload.announcementType
 * @param {string} payload.requesterId
 */
function buildAnnouncementBlocks(payload) {
  const typeMeta = ANNOUNCEMENT_TYPES[payload.announcementType] || {
    label: payload.announcementType,
    emoji: ':mega:',
  };

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${typeMeta.emoji} ${payload.title}`.slice(0, 150),
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Type:*\n${typeMeta.label}`,
        },
        {
          type: 'mrkdwn',
          text: `*Window:*\n${payload.window}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Impact*\n${payload.impact}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Message*\n${payload.customMessage}`,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Announced by <@${payload.requesterId}>`,
        },
      ],
    },
  ];
}

/**
 * Ephemeral preview shown to the requester after modal submit
 * @param {object} payload Same shape as buildAnnouncementBlocks
 * @param {string} privateMetadata JSON-encoded payload for Send action
 */
function buildPreviewBlocks(payload, privateMetadata) {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Preview* — review the announcement below, then Send or Cancel.',
      },
    },
    { type: 'divider' },
    ...buildAnnouncementBlocks(payload),
    { type: 'divider' },
    {
      type: 'actions',
      block_id: 'preview_actions',
      elements: [
        {
          type: 'button',
          style: 'primary',
          text: { type: 'plain_text', text: 'Send' },
          action_id: 'maintenance_send',
          value: privateMetadata,
        },
        {
          type: 'button',
          style: 'danger',
          text: { type: 'plain_text', text: 'Cancel' },
          action_id: 'maintenance_cancel',
          value: 'cancelled',
        },
      ],
    },
  ];
}

/**
 * Extract form values from a view_submission state
 * @param {object} stateValues view.state.values
 */
function extractModalValues(stateValues) {
  return {
    title: stateValues.title_block.title.value.trim(),
    window: stateValues.window_block.window.value.trim(),
    impact: stateValues.impact_block.impact.value.trim(),
    customMessage: stateValues.message_block.custom_message.value.trim(),
    announcementType: stateValues.type_block.announcement_type.selected_option.value,
  };
}

module.exports = {
  ANNOUNCEMENT_TYPES,
  buildMaintenanceModal,
  buildAnnouncementBlocks,
  buildPreviewBlocks,
  extractModalValues,
};
