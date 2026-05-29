import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoSyncPitch } from './AutoSyncPitch';
import { get2ankiApi } from '../../../../lib/backend/get2ankiApi';

vi.mock('../../../../lib/backend/get2ankiApi');

describe('AutoSyncPitch', () => {
  beforeEach(() => {
    vi.mocked(get2ankiApi).mockReturnValue({
      dismissAutoSyncPitch: vi.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof get2ankiApi>);
  });

  it('renders the pitch copy', () => {
    render(<AutoSyncPitch onDismissed={() => undefined} />);
    expect(screen.getByText(/Edited this page in Notion/)).toBeDefined();
    expect(screen.getByText(/Auto Sync keeps your deck up to date/)).toBeDefined();
  });

  it('shows the dismiss button', () => {
    render(<AutoSyncPitch onDismissed={() => undefined} />);
    expect(screen.getByRole('button', { name: /Not now/i })).toBeDefined();
  });

  it('calls onDismissed after dismiss is clicked', async () => {
    const onDismissed = vi.fn();
    render(<AutoSyncPitch onDismissed={onDismissed} />);
    fireEvent.click(screen.getByRole('button', { name: /Not now/i }));
    await waitFor(() => {
      expect(onDismissed).toHaveBeenCalledTimes(1);
    });
  });

  it('calls dismissAutoSyncPitch API when dismissed', async () => {
    const mockDismiss = vi.fn().mockResolvedValue(undefined);
    vi.mocked(get2ankiApi).mockReturnValue({
      dismissAutoSyncPitch: mockDismiss,
    } as ReturnType<typeof get2ankiApi>);
    render(<AutoSyncPitch onDismissed={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Not now/i }));
    await waitFor(() => {
      expect(mockDismiss).toHaveBeenCalledWith('convert_success');
    });
  });

  it('links to /pricing#auto-sync', () => {
    render(<AutoSyncPitch onDismissed={() => undefined} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/pricing#auto-sync');
  });
});
