import { act, render, screen } from '@testing-library/react';
import React, { type ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DomRecoveryBoundary,
  MAX_REMOUNTS,
  shouldRemount,
} from './DomRecoveryBoundary';

function makeNotFoundError(): DOMException {
  return new DOMException(
    "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.",
    'NotFoundError'
  );
}

function Healthy(): ReactElement {
  return <p>Upload page</p>;
}

function AlwaysThrows(): ReactElement {
  throw new Error('boom');
}

describe('shouldRemount', () => {
  it('remounts on a DOM NotFoundError under the cap', () => {
    expect(shouldRemount(makeNotFoundError(), 0)).toBe(true);
  });

  it('stops remounting once the cap is reached', () => {
    expect(shouldRemount(makeNotFoundError(), MAX_REMOUNTS)).toBe(false);
  });

  it('does not remount a non-DOM error', () => {
    expect(shouldRemount(new Error('boom'), 0)).toBe(false);
  });
});

describe('DomRecoveryBoundary', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders children untouched while healthy', () => {
    render(
      <DomRecoveryBoundary>
        <Healthy />
      </DomRecoveryBoundary>
    );

    expect(screen.getByText('Upload page')).toBeInTheDocument();
  });

  it('shows the recovery fallback and reports a persisting error', () => {
    const onError = vi.fn();

    render(
      <DomRecoveryBoundary onError={onError}>
        <AlwaysThrows />
      </DomRecoveryBoundary>
    );

    expect(
      screen.getByRole('heading', { name: /something went wrong/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^reload$/i })
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
  });

  it('remounts once on a commit-phase DOM error, then keeps the subtree alive', () => {
    const onRecover = vi.fn();
    const ref = React.createRef<DomRecoveryBoundary>();

    render(
      <DomRecoveryBoundary ref={ref} onRecover={onRecover}>
        <Healthy />
      </DomRecoveryBoundary>
    );

    act(() => {
      ref.current!.componentDidCatch(makeNotFoundError(), {
        componentStack: '',
      });
    });

    expect(onRecover).toHaveBeenCalledOnce();
    expect(screen.getByText('Upload page')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /something went wrong/i })
    ).not.toBeInTheDocument();
  });

  it('shows the fallback after a second commit-phase DOM error', () => {
    const onRecover = vi.fn();
    const ref = React.createRef<DomRecoveryBoundary>();

    render(
      <DomRecoveryBoundary ref={ref} onRecover={onRecover}>
        <Healthy />
      </DomRecoveryBoundary>
    );

    act(() => {
      ref.current!.componentDidCatch(makeNotFoundError(), {
        componentStack: '',
      });
    });
    act(() => {
      ref.current!.setState({ error: makeNotFoundError() });
      ref.current!.componentDidCatch(makeNotFoundError(), {
        componentStack: '',
      });
    });

    expect(onRecover).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('heading', { name: /something went wrong/i })
    ).toBeInTheDocument();
  });

  it('catches a DOM error thrown from a non-upload route and shows recovery UI', () => {
    const onError = vi.fn();

    function ThrowsDomError(): ReactElement {
      throw makeNotFoundError();
    }

    render(
      <MemoryRouter initialEntries={['/pricing']}>
        <DomRecoveryBoundary onError={onError}>
          <Routes>
            <Route path="/pricing" element={<ThrowsDomError />} />
          </Routes>
        </DomRecoveryBoundary>
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /something went wrong/i })
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
  });

  it('reloads the page when the user clicks Reload on the fallback', () => {
    const reloadPage = vi.fn();

    render(
      <DomRecoveryBoundary reloadPage={reloadPage}>
        <AlwaysThrows />
      </DomRecoveryBoundary>
    );

    screen.getByRole('button', { name: /^reload$/i }).click();

    expect(reloadPage).toHaveBeenCalledOnce();
  });
});
