import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LogOutEverywhere } from './LogOutEverywhere';

const logoutEverywhere = vi.fn();

vi.mock('../../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({ logoutEverywhere }),
}));

describe('LogOutEverywhere', () => {
  beforeEach(() => {
    logoutEverywhere.mockReset();
    logoutEverywhere.mockResolvedValue(undefined);
  });

  it('renders the trigger button and does not revoke before confirming', () => {
    render(<LogOutEverywhere />);

    expect(
      screen.getByRole('button', { name: 'Log out everywhere' })
    ).toBeInTheDocument();
    expect(logoutEverywhere).not.toHaveBeenCalled();
  });

  it('revokes every session when the confirm step is clicked', async () => {
    render(<LogOutEverywhere />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Log out everywhere' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(logoutEverywhere).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the confirm step is cancelled', () => {
    render(<LogOutEverywhere />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Log out everywhere' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(logoutEverywhere).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Log out everywhere' })
    ).toBeInTheDocument();
  });
});
