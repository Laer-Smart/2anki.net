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

describe('Backend.getAnkifyReviewQueue', () => {
  it('returns connected with the cards on 200', async () => {
    const cards = [
      {
        cardId: 9001,
        questionHtml: '<p>Q</p>',
        answerHtml: '<p>A</p>',
        css: '',
      },
    ];
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ connected: true, cards }), { status: 200 })
    );

    const result = await new Backend().getAnkifyReviewQueue('My Deck');

    expect(result).toEqual({ connected: true, cards });
  });

  it('returns connected with an empty array on 200 with no due cards', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ connected: true, cards: [] }), {
        status: 200,
      })
    );

    const result = await new Backend().getAnkifyReviewQueue('My Deck');

    expect(result).toEqual({ connected: true, cards: [] });
  });

  it('maps a 503 to the offline reason', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'AnkiConnect is unreachable.' }), {
        status: 503,
      })
    );

    const result = await new Backend().getAnkifyReviewQueue('My Deck');

    expect(result).toEqual({ connected: false, reason: 'offline' });
  });

  it('maps a network error to the offline reason', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Failed to fetch'));

    const result = await new Backend().getAnkifyReviewQueue('My Deck');

    expect(result).toEqual({ connected: false, reason: 'offline' });
  });

  it('maps any other non-200 to the error reason', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'boom' }), { status: 500 })
    );

    const result = await new Backend().getAnkifyReviewQueue('My Deck');

    expect(result).toEqual({ connected: false, reason: 'error' });
  });
});
