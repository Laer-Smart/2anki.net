import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoSyncBanner } from './AutoSyncBanner';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';

vi.mock('../../../lib/backend/get2ankiApi');

describe('AutoSyncBanner', () => {
  beforeEach(() => {
    vi.mocked(get2ankiApi).mockReturnValue({
      getAutoSyncPitchEligibility: vi.fn().mockResolvedValue({ convertSuccess: false, accountBanner: true }),
      dismissAutoSyncPitch: vi.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof get2ankiApi>);
  });

  it('renders banner when accountBanner is true', async () => {
    render(<AutoSyncBanner />);
    await waitFor(() => {
      expect(screen.getByText(/Your decks already sync with us/)).toBeDefined();
    });
  });

  it('does not render when accountBanner is false', async () => {
    vi.mocked(get2ankiApi).mockReturnValue({
      getAutoSyncPitchEligibility: vi.fn().mockResolvedValue({ convertSuccess: false, accountBanner: false }),
      dismissAutoSyncPitch: vi.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof get2ankiApi>);
    render(<AutoSyncBanner />);
    await waitFor(() => {
      expect(screen.queryByText(/Your decks already sync with us/)).toBeNull();
    });
  });

  it('hides the banner when Not now is clicked', async () => {
    render(<AutoSyncBanner />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Not now/i })).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /Not now/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Your decks already sync with us/)).toBeNull();
    });
  });

  it('calls dismissAutoSyncPitch with account_banner on dismiss', async () => {
    const mockDismiss = vi.fn().mockResolvedValue(undefined);
    vi.mocked(get2ankiApi).mockReturnValue({
      getAutoSyncPitchEligibility: vi.fn().mockResolvedValue({ convertSuccess: false, accountBanner: true }),
      dismissAutoSyncPitch: mockDismiss,
    } as ReturnType<typeof get2ankiApi>);
    render(<AutoSyncBanner />);
    await waitFor(() => {
      screen.getByRole('button', { name: /Not now/i });
    });
    fireEvent.click(screen.getByRole('button', { name: /Not now/i }));
    await waitFor(() => {
      expect(mockDismiss).toHaveBeenCalledWith('account_banner');
    });
  });
});
