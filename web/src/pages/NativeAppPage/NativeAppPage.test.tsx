import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import NativeAppPage from './NativeAppPage';

const trackMock = vi.fn();
vi.mock('../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

const renderPage = () =>
  render(
    <HelmetProvider>
      <NativeAppPage />
    </HelmetProvider>
  );

const callsFor = (name: string) =>
  trackMock.mock.calls.filter(([eventName]) => eventName === name);

describe('NativeAppPage', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    trackMock.mockClear();
  });

  it('renders the hero title, body, and CTA', () => {
    renderPage();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '2anki for iPhone, iPad, and Mac',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/A native app is in the works/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'I want this' })
    ).toBeInTheDocument();
  });

  it('tracks native_app_page_viewed once on mount', () => {
    renderPage();
    expect(callsFor('native_app_page_viewed')).toHaveLength(1);
  });

  it('fires native_app_interest_clicked and swaps the CTA to a confirmation', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'I want this' }));
    expect(callsFor('native_app_interest_clicked')).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: 'I want this' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Noted. Watch What's New for updates.")
    ).toBeInTheDocument();
  });

  it('holds the guard across remounts — no second interest event, no button', () => {
    const first = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'I want this' }));
    first.unmount();

    renderPage();
    expect(
      screen.queryByRole('button', { name: 'I want this' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Noted. Watch What's New for updates.")
    ).toBeInTheDocument();
    expect(callsFor('native_app_interest_clicked')).toHaveLength(1);
  });
});
