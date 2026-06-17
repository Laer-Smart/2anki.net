import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
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
      <MemoryRouter>
        <NativeAppPage />
      </MemoryRouter>
    </HelmetProvider>
  );

const callsFor = (name: string) =>
  trackMock.mock.calls.filter(([eventName]) => eventName === name);

const links: AppStoreLinks = {
  available: true,
  iosUrl: 'https://apps.apple.com/app/id6775249373',
  macUrl: 'https://apps.apple.com/app/id6775249373?mt=12',
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

  it('renders the App Store badge and availability caption when links resolve', async () => {
    getAppStoreLinksMock.mockResolvedValue(links);
    renderPage();

    const badge = await screen.findByRole('link', {
      name: 'Download on the App Store',
    });
    expect(badge).toHaveAttribute('href', links.iosUrl);
    expect(
      screen.getByText('Free on the App Store — iPhone, iPad, and Mac.')
    ).toBeInTheDocument();
  });

  it('fires native_app_store_clicked on a badge click', async () => {
    getAppStoreLinksMock.mockResolvedValue(links);
    renderPage();

    fireEvent.click(
      await screen.findByRole('link', { name: 'Download on the App Store' })
    );
    expect(callsFor('native_app_store_clicked')).toEqual([
      ['native_app_store_clicked', { store: 'ios' }],
    ]);
  });

  it('shows the coming-soon notice card with a web CTA when unavailable', async () => {
    getAppStoreLinksMock.mockResolvedValue({ available: false });
    renderPage();

    expect(
      await screen.findByText('Coming soon to the App Store')
    ).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Convert a deck on the web' });
    expect(cta).toHaveAttribute('href', '/');
    expect(
      screen.queryByRole('link', { name: 'Download on the App Store' })
    ).not.toBeInTheDocument();
  });
});
