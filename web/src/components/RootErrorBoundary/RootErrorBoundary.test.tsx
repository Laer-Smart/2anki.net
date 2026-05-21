import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RootErrorBoundary } from './RootErrorBoundary';

function BrokenApp(): ReactElement {
  throw new Error('boom');
}

function ChunkBrokenApp(): ReactElement {
  throw new TypeError(
    'Failed to fetch dynamically imported module: https://2anki.net/assets/A.js'
  );
}

describe('RootErrorBoundary', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    reloadMock = vi.fn();
    vi.stubGlobal('location', { reload: reloadMock });
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('renders children while the app is healthy', () => {
    render(
      <RootErrorBoundary>
        <p>App loaded</p>
      </RootErrorBoundary>
    );

    expect(screen.getByText('App loaded')).toBeInTheDocument();
  });

  it('shows the generic recovery screen after a render crash', () => {
    const onError = vi.fn();

    render(
      <RootErrorBoundary onError={onError}>
        <BrokenApp />
      </RootErrorBoundary>
    );

    expect(
      screen.getByRole('heading', { name: /something went wrong loading 2anki/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^reload$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reset local data/i })
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
  });

  it('reloads the page when the user clicks Reload', () => {
    const reloadPage = vi.fn();

    render(
      <RootErrorBoundary reloadPage={reloadPage}>
        <BrokenApp />
      </RootErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /^reload$/i }));

    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it('clears localStorage and reloads when the user resets local data', () => {
    const reloadPage = vi.fn();
    localStorage.setItem('stale-key', '{"old":true}');

    render(
      <RootErrorBoundary reloadPage={reloadPage}>
        <BrokenApp />
      </RootErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /reset local data/i }));

    expect(localStorage.getItem('stale-key')).toBeNull();
    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it('does not render the fallback UI on first chunk-load error — triggers silent reload', () => {
    render(
      <RootErrorBoundary>
        <ChunkBrokenApp />
      </RootErrorBoundary>
    );

    expect(reloadMock).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole('heading', { name: /something went wrong/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /this page was updated/i })
    ).not.toBeInTheDocument();
  });

  it('shows chunk-specific copy on second chunk-load error within the cooldown', () => {
    sessionStorage.setItem('2anki:chunkReload:lastAt', String(Date.now()));

    render(
      <RootErrorBoundary>
        <ChunkBrokenApp />
      </RootErrorBoundary>
    );

    expect(reloadMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', {
        name: /this page was updated while you had it open/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /something went wrong loading 2anki/i })
    ).not.toBeInTheDocument();
  });
});
