import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CodeBlock from './CodeBlock';

describe('CodeBlock', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders the language label', () => {
    render(<CodeBlock language="python" code="print('hello')" />);
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('renders the code content', () => {
    render(<CodeBlock language="ts" code="const x = 1;" />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('shows copy button with aria-label', () => {
    render(<CodeBlock language="js" code="console.log(1)" />);
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
  });

  it('clicking copy calls clipboard.writeText with the code', async () => {
    render(<CodeBlock language="js" code="alert('hi')" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("alert('hi')");
  });

  it('falls back to "code" label when language is empty', () => {
    render(<CodeBlock language="" code="some code" />);
    expect(screen.getByText('code')).toBeInTheDocument();
  });
});
