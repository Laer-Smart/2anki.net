import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { McqModal } from './McqModal';

function renderModal(overrides: Partial<Parameters<typeof McqModal>[0]> = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    enabled: false,
    onEnabledChange: vi.fn(),
    ttsQuestion: '',
    ttsCorrectAnswer: '',
    ttsExtra: '',
    onTtsChange: vi.fn(),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <McqModal {...props} />
    </MemoryRouter>
  );
  return props;
}

describe('McqModal', () => {
  it('reflects the enabled state on the segmented control', () => {
    renderModal({ enabled: true });
    expect(screen.getByRole('button', { name: 'On' })).toHaveClass(
      /segmentActive/
    );
  });

  it('calls onEnabledChange when toggled on', () => {
    const onEnabledChange = vi.fn();
    renderModal({ enabled: false, onEnabledChange });
    fireEvent.click(screen.getByRole('button', { name: 'On' }));
    expect(onEnabledChange).toHaveBeenCalledWith(true);
  });

  it('hides read-aloud selects when MCQ is off', () => {
    renderModal({ enabled: false });
    expect(screen.queryByLabelText('Question')).not.toBeInTheDocument();
  });

  it('shows read-aloud selects and reports a TTS change when MCQ is on', () => {
    const onTtsChange = vi.fn();
    renderModal({ enabled: true, onTtsChange });
    fireEvent.change(screen.getByLabelText('Question'), {
      target: { value: 'en_US' },
    });
    expect(onTtsChange).toHaveBeenCalledWith('mcq-tts-question', 'en_US');
  });

  it('closes when Done is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
