import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import NativeAppPage from './NativeAppPage';
import { AppStoreLinks } from '../../lib/interfaces/AppStoreLinks';

const trackMock = vi.fn();
vi.mock('../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

const getAppStoreLinksMock = vi.fn();
vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({ getAppStoreLinks: getAppStoreLinksMock }),
}));

const renderPage = () =>
  render(
    <HelmetProvider>
      <NativeAppPage />
    </HelmetProvider>
  );

const callsFor = (name: string) =>
  trackMock.mock.calls.filter(([eventName]) => eventName === name);

const links: AppStoreLinks = {
  available: true,
  iosUrl: 'https://apps.apple.com/app/id1234567890',
  macUrl: 'https://apps.apple.com/app/id1234567890?mt=12',
};

describe('NativeAppPage', () => {
  beforeEach(() => {
    trackMock.mockClear();
    getAppStoreLinksMock.mockReset();
    getAppStoreLinksMock.mockResolvedValue({ available: false });
  });

  it('renders the hero title and body', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '2anki for iPhone, iPad, and Mac',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Convert your notes into Anki decks/)
    ).toBeInTheDocument();
  });

  it('tracks native_app_page_viewed once on mount', () => {
    renderPage();
    expect(callsFor('native_app_page_viewed')).toHaveLength(1);
  });

  it('renders both store badges with the resolved links', async () => {
    getAppStoreLinksMock.mockResolvedValue(links);
    renderPage();

    const ios = await screen.findByRole('link', {
      name: 'Download on the App Store',
    });
    const mac = screen.getByRole('link', {
      name: 'Download on the Mac App Store',
    });
    expect(ios).toHaveAttribute('href', links.iosUrl);
    expect(mac).toHaveAttribute('href', links.macUrl);
  });

  it('fires native_app_store_clicked with the platform on a badge click', async () => {
    getAppStoreLinksMock.mockResolvedValue(links);
    renderPage();

    fireEvent.click(
      await screen.findByRole('link', { name: 'Download on the App Store' })
    );
    expect(callsFor('native_app_store_clicked')).toEqual([
      ['native_app_store_clicked', { store: 'ios' }],
    ]);
  });

  it('shows the coming-soon fallback when store links are unavailable', async () => {
    getAppStoreLinksMock.mockResolvedValue({ available: false });
    renderPage();

    expect(
      await screen.findByText(/Coming to the App Store shortly/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
