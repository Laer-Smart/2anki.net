import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('renders the language label in the header strip', () => {
    render(<CodeBlock language="typescript" code="const x = 1;" />);
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('renders "plaintext" when no language is provided', () => {
    render(<CodeBlock code="hello world" />);
    expect(screen.getByText('plaintext')).toBeInTheDocument();
  });

  it('renders the code content', () => {
    render(<CodeBlock language="js" code="console.log('hi')" />);
    expect(screen.getByText("console.log('hi')")).toBeInTheDocument();
  });

  it('renders a Copy button in the header', () => {
    render(<CodeBlock language="python" code="print('x')" />);
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
  });

  it('clicking Copy calls navigator.clipboard.writeText with the code', async () => {
    render(<CodeBlock language="bash" code="echo hello" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('echo hello');
    });
  });

  it('briefly shows "Copied" text after clicking Copy', async () => {
    render(<CodeBlock language="bash" code="echo hello" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
  });
});
