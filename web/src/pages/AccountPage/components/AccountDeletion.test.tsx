import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AccountDeletion } from './AccountDeletion';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return { ...actual, useNavigate: () => navigate };
});

function renderComponent() {
  return render(
    <MemoryRouter>
      <AccountDeletion />
    </MemoryRouter>
  );
}

describe('AccountDeletion', () => {
  it('opens the confirmation dialog when Delete account is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

    expect(
      screen.getByRole('heading', { name: 'Delete account?' })
    ).toBeInTheDocument();
  });

  it('closes the dialog and does not navigate when Cancel is clicked', () => {
    navigate.mockClear();
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates to /delete-account when the dialog confirm is clicked', () => {
    navigate.mockClear();
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

    const dialog = screen.getByRole('dialog', { hidden: true });
    const confirm = within(dialog).getByRole('button', {
      name: 'Delete account',
    });
    fireEvent.click(confirm);

    expect(navigate).toHaveBeenCalledWith('/delete-account');
  });
});
