import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import useJobs from './useJobs';
import Backend from '../../../lib/backend';

function makeMockBackend(): Backend {
  return {
    getJobs: vi.fn().mockResolvedValue([]),
    deleteJob: vi.fn(),
    restartClaudeJob: vi.fn(),
    convert: vi.fn(),
  } as unknown as Backend;
}

describe('useJobs warmup window', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls at 3000ms initially (warmup active, no active jobs)', async () => {
    const backend = makeMockBackend();
    const setError = vi.fn();
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    renderHook(() => useJobs(backend, setError));

    await act(async () => {
      await Promise.resolve();
    });

    const callsWithMs = setIntervalSpy.mock.calls.filter(
      (c) => typeof c[1] === 'number'
    );
    const firstIntervalMs = callsWithMs[0]?.[1];
    expect(firstIntervalMs).toBe(3000);
  });

  it('switches to 10000ms after warmup expires with no active jobs', async () => {
    const backend = makeMockBackend();
    const setError = vi.fn();
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    renderHook(() => useJobs(backend, setError));

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(16000);
      await Promise.resolve();
    });

    const callsWithMs = setIntervalSpy.mock.calls.filter(
      (c) => typeof c[1] === 'number'
    );
    const lastIntervalMs = callsWithMs[callsWithMs.length - 1]?.[1];
    expect(lastIntervalMs).toBe(10000);
  });
});
