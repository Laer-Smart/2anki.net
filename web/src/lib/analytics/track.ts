import { KnownEvent } from './events';

export function track(name: KnownEvent, props?: Record<string, unknown>): void {
  globalThis
    .fetch('/api/events/track', {
      method: 'POST',
      keepalive: true,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ name, props }),
    })
    .catch(() => {
      // Analytics failures are silent — never break the user flow
    });
}
