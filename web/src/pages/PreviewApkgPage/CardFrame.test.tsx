import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ApkgPreviewCard } from '../../lib/backend/getApkgPreview';
import { CardFrame } from './CardFrame';

const buildCard = (
  overrides: Partial<ApkgPreviewCard> = {}
): ApkgPreviewCard => ({
  id: 1,
  ord: 0,
  deckName: 'Sample Deck',
  deckPath: ['Sample Deck'],
  templateName: 'Basic',
  noteTypeName: 'Basic',
  front: 'Front content',
  back: 'Back content',
  css: 'body { color: #111; }',
  ...overrides,
});

const noop = () => {};

const getSrcDoc = (container: HTMLElement): string => {
  const iframe = container.querySelector('iframe');
  if (iframe == null) throw new Error('iframe not rendered');
  return iframe.getAttribute('srcdoc') ?? '';
};

const waitForSrcDoc = (container: HTMLElement): Promise<string> =>
  waitFor(() => {
    const srcDoc = getSrcDoc(container);
    if (!srcDoc) throw new Error('srcdoc not populated yet');
    return srcDoc;
  });

const getIframe = (container: HTMLElement): HTMLIFrameElement => {
  const iframe = container.querySelector('iframe');
  if (iframe == null) throw new Error('iframe not rendered');
  return iframe as HTMLIFrameElement;
};

describe('CardFrame sandbox', () => {
  it('sets sandbox to allow-scripts only', () => {
    const { container } = render(
      <CardFrame
        card={buildCard()}
        cardIndex={0}
        onEdit={noop}
        isEditable={false}
      />
    );
    expect(getIframe(container).getAttribute('sandbox')).toBe('allow-scripts');
  });
});

describe('CardFrame srcDoc', () => {
  it('does not inject hardcoded background or foreground colors', async () => {
    const card = buildCard({ css: '' });
    const { container } = render(
      <CardFrame card={card} cardIndex={0} onEdit={noop} isEditable={false} />
    );
    const srcDoc = await waitForSrcDoc(container);
    expect(srcDoc).not.toContain('background: #fff');
    expect(srcDoc).not.toContain('color: #111');
  });

  it('includes color-scheme meta tag', async () => {
    const { container } = render(
      <CardFrame
        card={buildCard()}
        cardIndex={0}
        onEdit={noop}
        isEditable={false}
      />
    );
    const srcDoc = await waitForSrcDoc(container);
    expect(srcDoc).toContain('<meta name="color-scheme" content="light dark">');
  });

  it('includes the resize-observer script', async () => {
    const { container } = render(
      <CardFrame
        card={buildCard()}
        cardIndex={0}
        onEdit={noop}
        isEditable={false}
      />
    );
    const srcDoc = await waitForSrcDoc(container);
    expect(srcDoc).toContain('ResizeObserver');
    expect(srcDoc).toContain('2anki-preview');
  });

  it('leaves benign markup intact', async () => {
    const card = buildCard({
      front: '<p class="q"><strong>Q:</strong> What is spaced repetition?</p>',
    });
    const { container } = render(
      <CardFrame card={card} cardIndex={0} onEdit={noop} isEditable={false} />
    );
    const srcDoc = await waitForSrcDoc(container);
    expect(srcDoc).toContain('<p class="q">');
    expect(srcDoc).toContain('<strong>Q:</strong>');
  });

  it('includes card scripts in srcDoc', async () => {
    const card = buildCard({
      front: 'Hello<script>alert(1)</script> world',
    });
    const { container } = render(
      <CardFrame card={card} cardIndex={0} onEdit={noop} isEditable={false} />
    );
    const srcDoc = await waitForSrcDoc(container);
    expect(srcDoc).toContain('alert(1)');
  });
});

describe('CardFrame postMessage height update', () => {
  it('updates frame height when a matching postMessage arrives', async () => {
    const card = buildCard({ id: 42 });
    const { container } = render(
      <CardFrame card={card} cardIndex={0} onEdit={noop} isEditable={false} />
    );
    const iframe = getIframe(container);

    Object.defineProperty(iframe, 'contentWindow', {
      value: window,
      writable: true,
    });

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: '2anki-preview', cardId: '42', height: 480 },
          source: window,
          origin: 'null',
        })
      );
    });

    expect(iframe.style.height).toBe('480px');
  });

  it('ignores messages with wrong source string', async () => {
    const card = buildCard({ id: 7 });
    const { container } = render(
      <CardFrame card={card} cardIndex={0} onEdit={noop} isEditable={false} />
    );
    const iframe = getIframe(container);

    Object.defineProperty(iframe, 'contentWindow', {
      value: window,
      writable: true,
    });

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: 'other', cardId: '7', height: 900 },
          source: window,
          origin: 'null',
        })
      );
    });

    expect(iframe.style.height).not.toBe('900px');
  });

  it('ignores messages with mismatched cardId', async () => {
    const card = buildCard({ id: 5 });
    const { container } = render(
      <CardFrame card={card} cardIndex={0} onEdit={noop} isEditable={false} />
    );
    const iframe = getIframe(container);

    Object.defineProperty(iframe, 'contentWindow', {
      value: window,
      writable: true,
    });

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: '2anki-preview', cardId: '999', height: 700 },
          source: window,
          origin: 'null',
        })
      );
    });

    expect(iframe.style.height).not.toBe('700px');
  });

  it('ignores messages whose origin is not the sandboxed null origin', async () => {
    const card = buildCard({ id: 11 });
    const { container } = render(
      <CardFrame card={card} cardIndex={0} onEdit={noop} isEditable={false} />
    );
    const iframe = getIframe(container);

    Object.defineProperty(iframe, 'contentWindow', {
      value: window,
      writable: true,
    });

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: '2anki-preview', cardId: '11', height: 600 },
          source: window,
          origin: 'https://evil.example',
        })
      );
    });

    expect(iframe.style.height).not.toBe('600px');
  });

  it('clamps height to MAX_FRAME_HEIGHT when value is too large', async () => {
    const card = buildCard({ id: 3 });
    const { container } = render(
      <CardFrame card={card} cardIndex={0} onEdit={noop} isEditable={false} />
    );
    const iframe = getIframe(container);

    Object.defineProperty(iframe, 'contentWindow', {
      value: window,
      writable: true,
    });

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: '2anki-preview', cardId: '3', height: 99999 },
          source: window,
          origin: 'null',
        })
      );
    });

    expect(iframe.style.height).toBe('2000px');
  });
});

describe('CardFrame edit controls', () => {
  it('shows Delete and Suspend buttons when isEditable is true', () => {
    render(
      <CardFrame
        card={buildCard()}
        cardIndex={0}
        onEdit={noop}
        isEditable={true}
      />
    );
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /suspend/i })
    ).toBeInTheDocument();
  });

  it('does not show Delete or Suspend when isEditable is false', () => {
    render(
      <CardFrame
        card={buildCard()}
        cardIndex={0}
        onEdit={noop}
        isEditable={false}
      />
    );
    expect(
      screen.queryByRole('button', { name: /delete/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /suspend/i })
    ).not.toBeInTheDocument();
  });

  it('calls onEdit with deleted=true when Delete is clicked', () => {
    const onEdit = vi.fn();
    render(
      <CardFrame
        card={buildCard()}
        cardIndex={2}
        onEdit={onEdit}
        isEditable={true}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onEdit).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ deleted: true })
    );
  });

  it('calls onEdit with suspended=true when Suspend is clicked', () => {
    const onEdit = vi.fn();
    render(
      <CardFrame
        card={buildCard()}
        cardIndex={1}
        onEdit={onEdit}
        isEditable={true}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /suspend/i }));
    expect(onEdit).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ suspended: true })
    );
  });

  it('shows Restore button when card is marked deleted', () => {
    render(
      <CardFrame
        card={buildCard()}
        cardIndex={0}
        editState={{ deleted: true }}
        onEdit={noop}
        isEditable={true}
      />
    );
    expect(
      screen.getByRole('button', { name: /restore/i })
    ).toBeInTheDocument();
  });

  it('shows Edit front and Edit back buttons when isEditable is true', () => {
    render(
      <CardFrame
        card={buildCard()}
        cardIndex={0}
        onEdit={noop}
        isEditable={true}
      />
    );
    expect(
      screen.getByRole('button', { name: /edit front/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /edit back/i })
    ).toBeInTheDocument();
  });

  it('clicking Edit front shows a textarea with the current front text', () => {
    render(
      <CardFrame
        card={buildCard({ front: 'original' })}
        cardIndex={0}
        onEdit={noop}
        isEditable={true}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit front/i }));
    const textarea = screen.getByRole('textbox', { name: /front/i });
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toBe('original');
  });

  it('pressing Escape on the front editor cancels the edit without calling onEdit', () => {
    const onEdit = vi.fn();
    render(
      <CardFrame
        card={buildCard()}
        cardIndex={0}
        onEdit={onEdit}
        isEditable={true}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit front/i }));
    const textarea = screen.getByRole('textbox', { name: /front/i });
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(
      screen.queryByRole('textbox', { name: /front/i })
    ).not.toBeInTheDocument();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('pressing Enter on the front editor commits the edit', () => {
    const onEdit = vi.fn();
    render(
      <CardFrame
        card={buildCard()}
        cardIndex={3}
        onEdit={onEdit}
        isEditable={true}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /edit front/i }));
    const textarea = screen.getByRole('textbox', { name: /front/i });
    fireEvent.change(textarea, { target: { value: 'new front text' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onEdit).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ front: 'new front text' })
    );
  });
});
