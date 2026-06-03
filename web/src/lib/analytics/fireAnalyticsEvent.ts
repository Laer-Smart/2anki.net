export type ConversionEventName =
  | 'upload_started'
  | 'conversion_success'
  | 'deck_downloaded'
  | 'make_another_deck_clicked';

interface AnalyticsWindow {
  hj?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
}

export function fireAnalyticsEvent(name: ConversionEventName): void {
  const w = globalThis as AnalyticsWindow;
  w.hj?.('event', name);
  w.gtag?.('event', name);
}
