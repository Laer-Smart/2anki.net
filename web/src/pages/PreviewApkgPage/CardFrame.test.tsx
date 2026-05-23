import { act, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';

import { CardFrame } from './CardFrame';
import type { ApkgPreviewCard } from '../../lib/backend/getApkgPreview';

const buildCard = (overrides: Partial<ApkgPreviewCard> = {}): ApkgPreviewCard => ({
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

const getSrcDoc = (container: HTMLElement): string => {
  const iframe = container.querySelector('iframe');
  if (iframe == null) throw new Error('iframe not rendered');
  return iframe.getAttribute('srcdoc') ?? '';
};

const getIframe = (container: HTMLElement): HTMLIFrameElement => {
  const iframe = container.querySelector('iframe');
  if (iframe == null) throw new Error('iframe not rendered');
  return iframe as HTMLIFrameElement;
};

describe('CardFrame sandbox', () => {
  it('sets sandbox to allow-scripts only', () => {
    const { container } = render(<CardFrame card={buildCard()} />);
    expect(getIframe(container).getAttribute('sandbox')).toBe('allow-scripts');
  });
});

describe('CardFrame srcDoc', () => {
  it('does not inject hardcoded background or foreground colors', () => {
    const card = buildCard({ css: '' });
    const { container } = render(<CardFrame card={card} />);
    const srcDoc = getSrcDoc(container);
    expect(srcDoc).not.toContain('background: #fff');
    expect(srcDoc).not.toContain('color: #111');
  });

  it('includes color-scheme meta tag', () => {
    const { container } = render(<CardFrame card={buildCard()} />);
    const srcDoc = getSrcDoc(container);
    expect(srcDoc).toContain('<meta name="color-scheme" content="light dark">');
  });

  it('includes the resize-observer script', () => {
    const { container } = render(<CardFrame card={buildCard()} />);
    const srcDoc = getSrcDoc(container);
    expect(srcDoc).toContain('ResizeObserver');
    expect(srcDoc).toContain('2anki-preview');
  });

  it('leaves benign markup intact', () => {
    const card = buildCard({
      front: '<p class="q"><strong>Q:</strong> What is spaced repetition?</p>',
    });
    const { container } = render(<CardFrame card={card} />);
    const srcDoc = getSrcDoc(container);
    expect(srcDoc).toContain('<p class="q">');
    expect(srcDoc).toContain('<strong>Q:</strong>');
  });

  it('includes card scripts in srcDoc', () => {
    const card = buildCard({
      front: 'Hello<script>alert(1)</script> world',
    });
    const { container } = render(<CardFrame card={card} />);
    const srcDoc = getSrcDoc(container);
    expect(srcDoc).toContain('alert(1)');
  });
});

describe('CardFrame postMessage height update', () => {
  it('updates frame height when a matching postMessage arrives', async () => {
    const card = buildCard({ id: 42 });
    const { container } = render(<CardFrame card={card} />);
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
    const { container } = render(<CardFrame card={card} />);
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
    const { container } = render(<CardFrame card={card} />);
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
    const { container } = render(<CardFrame card={card} />);
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
    const { container } = render(<CardFrame card={card} />);
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
