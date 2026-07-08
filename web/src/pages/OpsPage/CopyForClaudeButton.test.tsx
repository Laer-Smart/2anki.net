import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CopyForClaudeButton from './CopyForClaudeButton';

describe('CopyForClaudeButton', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders the default label', () => {
    render(<CopyForClaudeButton getText={() => 'hi'} />);
    expect(
      screen.getByRole('button', { name: 'Copy for Claude Code' })
    ).toBeInTheDocument();
  });

  it('writes the built text to the clipboard on click', async () => {
    render(<CopyForClaudeButton getText={() => 'prompt body'} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('prompt body')
    );
  });

  it('shows "Copied" after a successful copy, then reverts', async () => {
    render(<CopyForClaudeButton getText={() => 'x'} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByText('Copied')).toBeInTheDocument());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1600));
    });
    expect(screen.getByText('Copy for Claude Code')).toBeInTheDocument();
  });

  it('is disabled and does not copy when disabled', () => {
    render(<CopyForClaudeButton getText={() => 'x'} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});
