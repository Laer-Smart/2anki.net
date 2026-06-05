import { DownloadPage } from './DownloadPage';
import { DownloadPageViewModel } from '../../controllers/DownloadController';

function render(viewModel: DownloadPageViewModel): string {
  return DownloadPage(viewModel);
}

const BANNED_PATTERNS = [/✅/, /❌/, /📦/, /📄/, /Success!/, /Awesome/, /!/];

function assertNoBannedContent(html: string) {
  for (const pattern of BANNED_PATTERNS) {
    expect(html).not.toMatch(pattern);
  }
}

describe('DownloadPage', () => {
  describe('N=0 empty state', () => {
    const viewModel: DownloadPageViewModel = {
      id: 'ws-empty',
      sourceTitle: null,
      files: [],
      totalSizeBytes: 0,
    };

    it('shows empty state heading', () => {
      const html = render(viewModel);
      expect(html).toContain('No decks found in your upload');
    });

    it('shows empty state body', () => {
      const html = render(viewModel);
      expect(html).toContain(
        'Check that your file follows the formatting guidelines and try again.'
      );
    });

    it('contains no banned content', () => {
      assertNoBannedContent(render(viewModel));
    });
  });

  describe('N=1 single deck', () => {
    const viewModel: DownloadPageViewModel = {
      id: 'ws-one',
      sourceTitle: null,
      files: [
        {
          originalName: '-How-to-make-all-cloze-number-1-5827131637243234.apkg',
          displayName: 'How to make all cloze number 1',
          sizeBytes: 254_000,
        },
      ],
      totalSizeBytes: 254_000,
    };

    it('H1 reads "1 deck ready"', () => {
      const html = render(viewModel);
      expect(html).toContain('1 deck ready');
    });

    it('primary CTA reads "Download all (1)"', () => {
      const html = render(viewModel);
      expect(html).toContain('Download all (1)');
    });

    it('expiry line is correct', () => {
      const html = render(viewModel);
      expect(html).toContain('Available for 2 hours, then removed.');
    });

    it('CTA and expiry are co-located (within same container tag)', () => {
      const html = render(viewModel);
      const ctaIndex = html.indexOf('Download all (1)');
      const expiryIndex = html.indexOf('Available for 2 hours, then removed.');
      expect(Math.abs(ctaIndex - expiryIndex)).toBeLessThan(400);
    });

    it('cleaned filename appears', () => {
      const html = render(viewModel);
      expect(html).toContain('How to make all cloze number 1');
    });

    it('contains no subhead when sourceTitle is null', () => {
      const html = render(viewModel);
      expect(html).not.toContain('From ');
    });

    it('contains no banned content', () => {
      assertNoBannedContent(render(viewModel));
    });
  });

  describe('N=17 many decks', () => {
    const files = Array.from({ length: 17 }, (_, i) => ({
      originalName: `-Deck-${i + 1}-5827131637243234.apkg`,
      displayName: `Deck ${i + 1}`,
      sizeBytes: 100_000 * (i + 1),
    }));
    const viewModel: DownloadPageViewModel = {
      id: 'ws-17',
      sourceTitle: 'Biology Notes',
      files,
      totalSizeBytes: files.reduce((s, f) => s + f.sizeBytes, 0),
    };

    it('H1 reads "17 decks ready"', () => {
      const html = render(viewModel);
      expect(html).toContain('17 decks ready');
    });

    it('shows subhead with sourceTitle', () => {
      const html = render(viewModel);
      expect(html).toContain('From Biology Notes');
    });

    it('renders sticky bar with count', () => {
      const html = render(viewModel);
      expect(html).toContain('17 decks');
    });

    it('count appears in the rendered output', () => {
      const html = render(viewModel);
      expect(html).toContain('17');
    });

    it('all cleaned deck names appear', () => {
      const html = render(viewModel);
      for (let i = 1; i <= 17; i++) {
        expect(html).toContain(`Deck ${i}`);
      }
    });

    it('footer contains 2anki.net, Documentation, GitHub', () => {
      const html = render(viewModel);
      expect(html).toContain('2anki.net');
      expect(html).toContain('Documentation');
      expect(html).toContain('GitHub');
    });

    it('footer does not contain copyright symbol', () => {
      const html = render(viewModel);
      expect(html).not.toContain('©');
      expect(html).not.toContain('&copy;');
    });

    it('contains no banned content', () => {
      assertNoBannedContent(render(viewModel));
    });
  });

  describe('XSS safety', () => {
    it('escapes angle brackets in filenames so no raw svg tag is injected', () => {
      const viewModel: DownloadPageViewModel = {
        id: 'ws-xss',
        sourceTitle: null,
        files: [
          {
            originalName: '<svg onload="alert(1)">.apkg',
            displayName: 'svg onload alert 1',
            sizeBytes: 1000,
          },
        ],
        totalSizeBytes: 1000,
      };
      const html = render(viewModel);
      expect(html).not.toContain('<svg');
      expect(html).toContain('&lt;svg');
    });
  });
});
