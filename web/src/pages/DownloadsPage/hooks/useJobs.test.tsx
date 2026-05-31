import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import useJobs from './useJobs';
import Backend from '../../../lib/backend';
import { UserNotice } from '../../../lib/errors/UserNotice';
import { JobsId } from '../../../schemas/public/Jobs';
import JobResponse from '../../../schemas/public/JobResponse';

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

  it('surfaces a UserNotice when delete fails because the job is in progress', async () => {
    const backend = makeMockBackend();
    (backend.deleteJob as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Cannot delete job while it is in progress')
    );
    const setError = vi.fn();

    const { result } = renderHook(() => useJobs(backend, setError));

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.deleteJob(1 as JobsId);
    });

    expect(setError).toHaveBeenCalledWith(expect.any(UserNotice));
    const notice = setError.mock.calls[0][0] as UserNotice;
    expect(notice.message).toBe(
      'This job is still running. Wait for it to finish.'
    );
  });

  it('keeps the last jobs and stays silent when a poll hits a transient 503', async () => {
    const backend = makeMockBackend();
    const job = { id: 7, status: 'done' } as unknown as JobResponse;
    const transient = new Error(
      'HTTP error! GET /upload/jobs status: 503, message: Service Unavailable'
    ) as Error & { status?: number };
    transient.status = 503;
    (backend.getJobs as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([job])
      .mockRejectedValueOnce(transient);
    const setError = vi.fn();

    const { result } = renderHook(() => useJobs(backend, setError));

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.refreshJobs();
    });

    expect(setError).not.toHaveBeenCalled();
    expect(result.current.jobs).toEqual([job]);
  });

  it('stays silent on a network/fetch poll failure and keeps the last jobs', async () => {
    const backend = makeMockBackend();
    const job = { id: 9, status: 'done' } as unknown as JobResponse;
    const networkError = new Error(
      'Network error on GET /upload/jobs: Failed to fetch'
    ) as Error & { status?: number };
    networkError.status = 0;
    (backend.getJobs as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([job])
      .mockRejectedValueOnce(networkError);
    const setError = vi.fn();

    const { result } = renderHook(() => useJobs(backend, setError));

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.refreshJobs();
    });

    expect(setError).not.toHaveBeenCalled();
    expect(result.current.jobs).toEqual([job]);
  });

  it('propagates an auth failure from a poll so the redirect path fires', async () => {
    const backend = makeMockBackend();
    const unauthorized = new UserNotice('Unauthorized') as UserNotice & {
      status?: number;
    };
    unauthorized.status = 401;
    (backend.getJobs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      unauthorized
    );
    const setError = vi.fn();

    renderHook(() => useJobs(backend, setError));

    await act(async () => {
      await Promise.resolve();
    });

    expect(setError).toHaveBeenCalledWith(unauthorized);
  });

  it('propagates a 403 forbidden poll failure instead of swallowing it', async () => {
    const backend = makeMockBackend();
    const forbidden = new Error(
      'HTTP error! GET /upload/jobs status: 403, message: Forbidden'
    ) as Error & { status?: number };
    forbidden.status = 403;
    (backend.getJobs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      forbidden
    );
    const setError = vi.fn();

    renderHook(() => useJobs(backend, setError));

    await act(async () => {
      await Promise.resolve();
    });

    expect(setError).toHaveBeenCalledWith(forbidden);
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
