import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import ComposerArea from './ComposerArea';

function renderComposer(
  overrides: Partial<React.ComponentProps<typeof ComposerArea>> = {}
) {
  const defaults: React.ComponentProps<typeof ComposerArea> = {
    inputValue: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    onAttach: vi.fn(),
    attachedFiles: [],
    onRemoveFile: vi.fn(),
    disabled: false,
    ...overrides,
  };
  return render(<ComposerArea {...defaults} />);
}

describe('ComposerArea — accessible labels', () => {
  it('textarea has aria-label "Message input"', () => {
    renderComposer();
    expect(
      screen.getByRole('textbox', { name: 'Message input' })
    ).toBeInTheDocument();
  });

  it('send button has aria-label "Send message"', () => {
    renderComposer({ inputValue: 'hi' });
    expect(
      screen.getByRole('button', { name: 'Send message' })
    ).toBeInTheDocument();
  });

  it('paperclip has aria-label "Attach files"', () => {
    renderComposer();
    expect(
      screen.getByRole('button', { name: 'Attach files' })
    ).toBeInTheDocument();
  });
});

describe('ComposerArea — keyboard behavior', () => {
  it('Enter calls onSubmit', () => {
    const onSubmit = vi.fn();
    renderComposer({ inputValue: 'hello', onSubmit });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Message input' }), {
      key: 'Enter',
      shiftKey: false,
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Shift+Enter does not call onSubmit', () => {
    const onSubmit = vi.fn();
    renderComposer({ inputValue: 'hello', onSubmit });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Message input' }), {
      key: 'Enter',
      shiftKey: true,
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Escape blurs textarea without clearing value', () => {
    renderComposer({ inputValue: 'Draft' });
    const textarea = screen.getByRole('textbox', {
      name: 'Message input',
    }) as HTMLTextAreaElement;
    textarea.focus();
    expect(document.activeElement).toBe(textarea);
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(document.activeElement).not.toBe(textarea);
    expect(textarea.value).toBe('Draft');
  });
});

describe('ComposerArea — composerCard styling', () => {
  it('root has composerCard class', () => {
    const { container } = renderComposer();
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/composerCard/i);
  });
});

describe('ComposerArea — send button conditional state', () => {
  it('send button is disabled and has muted class when input is empty and no files attached', () => {
    renderComposer({ inputValue: '' });
    const btn = screen.getByRole('button', { name: 'Send message' });
    expect(btn).toBeDisabled();
    expect(btn.className).not.toMatch(/sendBtnActive/i);
  });

  it('send button is enabled and has active class when input has content', () => {
    renderComposer({ inputValue: 'hello' });
    const btn = screen.getByRole('button', { name: 'Send message' });
    expect(btn).not.toBeDisabled();
    expect(btn.className).toMatch(/sendBtnActive/i);
  });

  it('send button is enabled and has active class when idle files are attached', () => {
    renderComposer({
      inputValue: '',
      attachedFiles: [
        {
          id: 'abc',
          file: new File(['x'], 'doc.pdf', { type: 'application/pdf' }),
          state: 'idle',
          retryCount: 0,
        },
      ],
    });
    const btn = screen.getByRole('button', { name: 'Send message' });
    expect(btn).not.toBeDisabled();
    expect(btn.className).toMatch(/sendBtnActive/i);
  });
});
