import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function beforeEachReset() {
  beforeEach(() => {
    localStorage.clear();
  });
}

import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { track } from '../../lib/analytics/track';
import { Sidebar } from './Sidebar';

vi.mock('../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

import { getCardUsage } from '../../lib/backend/getCardUsage';

vi.mock('../../lib/backend/getCardUsage', () => ({
  getCardUsage: vi.fn().mockResolvedValue({
    cards_used: 23,
    cards_limit: 100,
    unlimited: false,
  }),
}));

interface SidebarRenderOpts {
  pathname?: string;
  patreon?: boolean;
  subscriber?: boolean;
  autoSyncActive?: boolean;
  kiUI?: boolean;
  ops?: boolean;
  email?: string | null;
  locals?: {
    patreon?: boolean;
    subscriber?: boolean;
    autoSyncActive?: boolean;
  } | null;
  onLogOut?: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
}

function renderSidebar({
  pathname = '/upload',
  patreon = false,
  subscriber = false,
  autoSyncActive = false,
  kiUI = false,
  ops = false,
  email = 'alexander@alemayhu.com',
  locals,
  onLogOut = vi.fn(),
}: SidebarRenderOpts = {}) {
  const resolvedLocals =
    locals === undefined ? { patreon, subscriber, autoSyncActive } : locals;
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Sidebar
        email={email}
        locals={resolvedLocals}
        features={{ kiUI, ops }}
        onLogOut={onLogOut}
      />
    </MemoryRouter>
  );
}

describe('Sidebar convert group', () => {
  it('renders Upload, My Decks, and Notion to Anki for every logged-in user', () => {
    renderSidebar();
    expect(
      screen.getByRole('link', { name: 'Make flashcards' })
    ).toHaveAttribute('href', '/upload');
    expect(screen.getByRole('link', { name: 'My Decks' })).toHaveAttribute(
      'href',
      '/downloads'
    );
    expect(
      screen.getByRole('link', { name: 'Notion to Anki' })
    ).toHaveAttribute('href', '/notion');
  });

  it('shows Print as a normal link for free users (1 free PDF per month)', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Print Decks' })).toHaveAttribute(
      'href',
      '/print'
    );
    expect(
      screen.queryByRole('button', { name: /Print Decks — upgrade to unlock/i })
    ).not.toBeInTheDocument();
  });

  it('shows Print as a real link for paying users', () => {
    renderSidebar({ subscriber: true });
    expect(screen.getByRole('link', { name: 'Print Decks' })).toHaveAttribute(
      'href',
      '/print'
    );
  });

  it('hides Auto Sync from a subscriber without Auto Sync access', () => {
    renderSidebar({ subscriber: true });
    expect(
      screen.queryByRole('link', { name: 'Auto Sync' })
    ).not.toBeInTheDocument();
  });

  it('shows Auto Sync for a Lifetime (Patreon) user', () => {
    renderSidebar({ patreon: true });
    expect(screen.getByRole('link', { name: 'Auto Sync' })).toHaveAttribute(
      'href',
      '/ankify'
    );
  });

  it('shows Auto Sync for an Auto Sync subscriber', () => {
    renderSidebar({ subscriber: true, autoSyncActive: true });
    expect(screen.getByRole('link', { name: 'Auto Sync' })).toHaveAttribute(
      'href',
      '/ankify'
    );
  });
});

describe('Sidebar your-stuff group', () => {
  it('shows Settings for every logged-in user', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/card-options'
    );
  });

  it('marks Settings active on /card-options', () => {
    renderSidebar({ pathname: '/card-options' });
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('shows Favorites for a logged-in user', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Favorites' })).toHaveAttribute(
      'href',
      '/favorites'
    );
  });

  it('hides Favorites when there is no signed-in account', () => {
    renderSidebar({ email: null });
    expect(
      screen.queryByRole('link', { name: 'Favorites' })
    ).not.toBeInTheDocument();
  });
});

describe('Sidebar help group', () => {
  it('always shows Docs', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'href',
      '/documentation'
    );
  });

  it('shows Pricing only for free users', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute(
      'href',
      '/pricing'
    );
  });

  it('hides Pricing for paying users', () => {
    renderSidebar({ subscriber: true });
    expect(
      screen.queryByRole('link', { name: 'Pricing' })
    ).not.toBeInTheDocument();
  });

  it('does not render a Billing row for paying users', () => {
    renderSidebar({ patreon: true });
    expect(
      screen.queryByRole('link', { name: 'Billing' })
    ).not.toBeInTheDocument();
  });
});

describe('Sidebar admin group', () => {
  it('hides the admin group when no flags are on', () => {
    renderSidebar();
    expect(screen.queryByRole('link', { name: 'KI' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ops' })).not.toBeInTheDocument();
  });

  it('shows KI when kiUI is on', () => {
    renderSidebar({ kiUI: true });
    expect(screen.getByRole('link', { name: 'KI' })).toHaveAttribute(
      'href',
      '/ki'
    );
  });

  it('shows Ops when ops is on', () => {
    renderSidebar({ ops: true });
    expect(screen.getByRole('link', { name: 'Ops' })).toHaveAttribute(
      'href',
      '/ops'
    );
  });
});

describe('Sidebar identity block', () => {
  it('renders the email and plan label', () => {
    renderSidebar({ email: 'alexander@alemayhu.com', patreon: true });
    expect(screen.getByText('alexander@alemayhu.com')).toBeInTheDocument();
    expect(screen.getByText('Lifetime')).toBeInTheDocument();
  });

  it('shows Free when neither plan flag is set', () => {
    renderSidebar();
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('renders Account and Log out as first-class rows', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute(
      'href',
      '/account'
    );
    expect(screen.getByRole('link', { name: /log out/i })).toBeInTheDocument();
  });

  it('fires onLogOut when the Log out row is clicked', () => {
    const onLogOut = vi.fn();
    renderSidebar({ onLogOut });
    fireEvent.click(screen.getByRole('link', { name: /log out/i }));
    expect(onLogOut).toHaveBeenCalledTimes(1);
  });
});

describe('Sidebar active state', () => {
  it('marks the My Decks row active on /downloads', () => {
    renderSidebar({ pathname: '/downloads' });
    expect(screen.getByRole('link', { name: 'My Decks' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(
      screen.getByRole('link', { name: 'Make flashcards' })
    ).not.toHaveAttribute('aria-current', 'page');
  });

  it('marks the Account row active on /account', () => {
    renderSidebar({ pathname: '/account' });
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('marks the My Decks row active on a /downloads sub-route', () => {
    renderSidebar({ pathname: '/downloads/123' });
    expect(screen.getByRole('link', { name: 'My Decks' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });
});

describe('Sidebar group hierarchy', () => {
  it('labels the Library and Resources groups', () => {
    renderSidebar();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
  });

  it('orders the top feature group by visit frequency (Upload, Notion, Note types first)', () => {
    renderSidebar();
    const nav = screen.getByRole('navigation');
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) =>
      a.getAttribute('href')
    );
    const upload = hrefs.indexOf('/upload');
    const notion = hrefs.indexOf('/notion');
    const templates = hrefs.indexOf('/templates');
    const importRoute = hrefs.indexOf('/import');
    expect(upload).toBeGreaterThanOrEqual(0);
    expect(upload).toBeLessThan(notion);
    expect(notion).toBeLessThan(templates);
    expect(templates).toBeLessThan(importRoute);
  });

  it('omits the Admin group label when no admin flags are on', () => {
    renderSidebar();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('does not render Admin group label even when ops is on', () => {
    renderSidebar({ ops: true });
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });
});

describe('Sidebar cards-used counter', () => {
  beforeEach(() => {
    vi.mocked(getCardUsage).mockClear();
  });

  it('renders the counter for free users with the fetched usage', async () => {
    renderSidebar();
    await waitFor(() => expect(screen.getByText('23')).toBeInTheDocument());
    expect(screen.getByText('/ 100 cards this month')).toBeInTheDocument();
  });

  it('does not render the counter for paying users', async () => {
    renderSidebar({ subscriber: true });
    await new Promise((r) => setTimeout(r, 10));
    expect(
      screen.queryByText('/ 100 cards this month')
    ).not.toBeInTheDocument();
  });

  it('does not call getCardUsage when locals is null (unauthenticated visitor)', async () => {
    renderSidebar({ locals: null });
    await new Promise((r) => setTimeout(r, 10));
    expect(getCardUsage).not.toHaveBeenCalled();
  });
});

describe('Sidebar collapse toggle', () => {
  beforeEachReset();

  it('defaults to expanded when localStorage has no preference', () => {
    renderSidebar();
    const aside = screen.getByRole('complementary', { name: 'primary' });
    expect(aside).toHaveAttribute('data-collapsed', 'false');
    expect(
      screen.getByRole('button', { name: 'Collapse sidebar' })
    ).toBeInTheDocument();
  });

  it('toggles the data-collapsed attribute on click', () => {
    renderSidebar();
    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
    fireEvent.click(toggle);
    const aside = screen.getByRole('complementary', { name: 'primary' });
    expect(aside).toHaveAttribute('data-collapsed', 'true');
    expect(
      screen.getByRole('button', { name: 'Expand sidebar' })
    ).toBeInTheDocument();
  });

  it('renders the rail label, flipping between Collapse and Expand', () => {
    renderSidebar();
    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
    expect(toggle).toHaveTextContent('Collapse');
    fireEvent.click(toggle);
    expect(
      screen.getByRole('button', { name: 'Expand sidebar' })
    ).toHaveTextContent('Expand');
  });

  it('persists the collapsed state to localStorage', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(localStorage.getItem('sidebar.collapsed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(localStorage.getItem('sidebar.collapsed')).toBe('false');
  });

  it('reads the collapsed state from localStorage on mount', () => {
    localStorage.setItem('sidebar.collapsed', 'true');
    renderSidebar();
    const aside = screen.getByRole('complementary', { name: 'primary' });
    expect(aside).toHaveAttribute('data-collapsed', 'true');
  });
});

describe('Sidebar auto-minimize', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(track).mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function advance(ms: number) {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  }

  it('auto-minimizes on /upload after 20 seconds of sidebar inactivity', () => {
    renderSidebar({ pathname: '/upload' });
    const aside = screen.getByRole('complementary', { name: 'primary' });
    expect(aside).toHaveAttribute('data-collapsed', 'false');
    advance(20_000);
    expect(aside).toHaveAttribute('data-collapsed', 'true');
    expect(track).toHaveBeenCalledWith('sidebar_auto_minimize_fired');
  });

  it('does not auto-minimize on a non-workflow route', () => {
    renderSidebar({ pathname: '/account' });
    const aside = screen.getByRole('complementary', { name: 'primary' });
    advance(60_000);
    expect(aside).toHaveAttribute('data-collapsed', 'false');
    expect(track).not.toHaveBeenCalled();
  });

  it('does not touch localStorage when auto-minimizing', () => {
    renderSidebar({ pathname: '/upload' });
    advance(20_000);
    expect(localStorage.getItem('sidebar.collapsed')).toBeNull();
  });

  it('resets the timer when the user hovers the sidebar', () => {
    renderSidebar({ pathname: '/upload' });
    const aside = screen.getByRole('complementary', { name: 'primary' });
    advance(15_000);
    fireEvent.mouseEnter(aside);
    advance(15_000);
    expect(aside).toHaveAttribute('data-collapsed', 'false');
    advance(10_000);
    expect(aside).toHaveAttribute('data-collapsed', 'true');
  });

  it('pins the sidebar when the user manually expands after auto-minimize', () => {
    renderSidebar({ pathname: '/upload' });
    const aside = screen.getByRole('complementary', { name: 'primary' });
    advance(20_000);
    expect(aside).toHaveAttribute('data-collapsed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(aside).toHaveAttribute('data-collapsed', 'false');
    expect(localStorage.getItem('sidebar.collapsed')).toBeNull();

    advance(60_000);
    expect(aside).toHaveAttribute('data-collapsed', 'false');
  });

  it('fires the reverted event when the user expands within 60s of auto-collapse', () => {
    renderSidebar({ pathname: '/upload' });
    advance(20_000);
    vi.mocked(track).mockClear();
    advance(5_000);
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(track).toHaveBeenCalledWith('sidebar_auto_minimize_reverted');
  });

  it('does not auto-minimize when the user already has a persisted collapsed preference', () => {
    localStorage.setItem('sidebar.collapsed', 'true');
    renderSidebar({ pathname: '/upload' });
    advance(20_000);
    expect(track).not.toHaveBeenCalled();
  });
});

describe('Sidebar More block', () => {
  it('renders the footer links', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      '/about'
    );
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      '/contact'
    );
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute(
      'href',
      '/documentation/misc/terms-of-service'
    );
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/documentation/misc/privacy-policy'
    );
  });
});
