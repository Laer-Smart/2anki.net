import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Backend } from './Backend';

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy);
  vi.stubGlobal('location', { origin: 'http://localhost', pathname: '/' });
  fetchSpy.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Backend.getAnkifyReviewCard', () => {
  it('returns connected with the card on 200', async () => {
    const card = {
      cardId: 9001,
      questionHtml: '<p>Q</p>',
      answerHtml: '<p>A</p>',
      css: '',
    };
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ connected: true, card }), { status: 200 })
    );

    const result = await new Backend().getAnkifyReviewCard(9001);

    expect(result).toEqual({ connected: true, card });
  });

  it('returns connected with card null when the card is gone', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ connected: true, card: null }), {
        status: 200,
      })
    );

    const result = await new Backend().getAnkifyReviewCard(9001);

    expect(result).toEqual({ connected: true, card: null });
  });

  it('maps a 503 to the offline reason', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'AnkiConnect is unreachable.' }), {
        status: 503,
      })
    );

    const result = await new Backend().getAnkifyReviewCard(9001);

    expect(result).toEqual({ connected: false, reason: 'offline' });
  });

  it('maps a network error to the offline reason', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Failed to fetch'));

    const result = await new Backend().getAnkifyReviewCard(9001);

    expect(result).toEqual({ connected: false, reason: 'offline' });
  });

  it('maps any other non-200 to the error reason', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'boom' }), { status: 500 })
    );

    const result = await new Backend().getAnkifyReviewCard(9001);

    expect(result).toEqual({ connected: false, reason: 'error' });
  });
});
