export const KNOWN_EVENTS = new Set([
  'upload_started',
  'conversion_succeeded',
  'conversion_failed',
  'deck_downloaded',
  'chat_message_sent',
  'chat_attachment_added',
  'upload_error_chat_shown',
  'upload_error_chat_engaged',
  'upload_error_chat_resolved_retry',
  'upload_empty_deck_chat_shown',
  'upload_empty_deck_chat_engaged',
  'paywall_shown',
  'paywall_upgrade_clicked',
  'purchase',
  'email_clicked',
  'email_batch_sent',
  'vision_photo_converted',
] as const);

export type KnownEvent = typeof KNOWN_EVENTS extends Set<infer T> ? T : never;
