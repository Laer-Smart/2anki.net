import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireAnalyticsEvent } from './fireAnalyticsEvent';

type AnalyticsGlobals = {
  hj?: ReturnType<typeof vi.fn>;
  gtag?: ReturnType<typeof vi.fn>;
};

describe('fireAnalyticsEvent', () => {
  beforeEach(() => {
    (globalThis as AnalyticsGlobals).hj = vi.fn();
    (globalThis as AnalyticsGlobals).gtag = vi.fn();
  });

  afterEach(() => {
    delete (globalThis as AnalyticsGlobals).hj;
    delete (globalThis as AnalyticsGlobals).gtag;
  });

  it('sends the event to gtag and hj when both are present', () => {
    fireAnalyticsEvent('upload_started');

    expect((globalThis as AnalyticsGlobals).gtag).toHaveBeenCalledWith(
      'event',
      'upload_started'
    );
    expect((globalThis as AnalyticsGlobals).hj).toHaveBeenCalledWith(
      'event',
      'upload_started'
    );
  });

  it('sends make_another_deck_clicked without throwing when both trackers are present', () => {
    expect(() => fireAnalyticsEvent('make_another_deck_clicked')).not.toThrow();
    expect((globalThis as AnalyticsGlobals).gtag).toHaveBeenCalledWith(
      'event',
      'make_another_deck_clicked'
    );
  });

  it('sends deck_downloaded without throwing when both trackers are present', () => {
    expect(() => fireAnalyticsEvent('deck_downloaded')).not.toThrow();
    expect((globalThis as AnalyticsGlobals).gtag).toHaveBeenCalledWith(
      'event',
      'deck_downloaded'
    );
  });

  it('does not throw when gtag is absent', () => {
    delete (globalThis as AnalyticsGlobals).gtag;
    expect(() => fireAnalyticsEvent('upload_started')).not.toThrow();
    expect((globalThis as AnalyticsGlobals).hj).toHaveBeenCalledWith(
      'event',
      'upload_started'
    );
  });

  it('does not throw when hj is absent', () => {
    delete (globalThis as AnalyticsGlobals).hj;
    expect(() => fireAnalyticsEvent('upload_started')).not.toThrow();
    expect((globalThis as AnalyticsGlobals).gtag).toHaveBeenCalledWith(
      'event',
      'upload_started'
    );
  });

  it('does not throw when neither tracker is present', () => {
    delete (globalThis as AnalyticsGlobals).hj;
    delete (globalThis as AnalyticsGlobals).gtag;
    expect(() => fireAnalyticsEvent('upload_started')).not.toThrow();
  });
});
