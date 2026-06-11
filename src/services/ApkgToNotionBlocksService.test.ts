import ApkgToNotionBlocksService, {
  buildTruncationNoticeBlocks,
} from './ApkgToNotionBlocksService';
import {
  NormalizedCollection,
  Note,
  NoteType,
  Deck,
  Card,
} from './ApkgPreviewService/types';

function buildCollection(overrides?: {
  noteTypes?: Map<number, NoteType>;
  notes?: Map<number, Note>;
  decks?: Map<number, Deck>;
  cards?: Card[];
}): NormalizedCollection {
  const defaultNoteType: NoteType = {
    id: 1,
    name: 'Basic',
    type: 0,
    css: '',
    fields: [
      { name: 'Front', ord: 0 },
      { name: 'Back', ord: 1 },
    ],
    templates: [
      { name: 'Card 1', ord: 0, qfmt: '{{Front}}', afmt: '{{Back}}' },
    ],
  };

  const defaultNote: Note = {
    id: 100,
    mid: 1,
    tags: '',
    fields: ['What is 2+2?', 'Four'],
  };

  const defaultDeck: Deck = { id: 10, name: 'Math' };

  const defaultCard: Card = { id: 1000, nid: 100, did: 10, ord: 0 };

  return {
    noteTypes: overrides?.noteTypes ?? new Map([[1, defaultNoteType]]),
    notes: overrides?.notes ?? new Map([[100, defaultNote]]),
    decks: overrides?.decks ?? new Map([[10, defaultDeck]]),
    cards: overrides?.cards ?? [defaultCard],
  };
}

function getToggle(
  blocks: ReturnType<typeof service.transform>['deckPages'][0]['children'],
  index = 0
) {
  const block = blocks[index];
  if (block.type !== 'heading_3')
    throw new Error(`Expected heading_3 at index ${index}, got ${block.type}`);
  return block;
}

const service = new ApkgToNotionBlocksService();

describe('ApkgToNotionBlocksService', () => {
  describe('transform', () => {
    it('creates a deck page with toggle blocks for each note', () => {
      const collection = buildCollection();
      const result = service.transform(collection, new Map(), 10000);

      expect(result.deckPages).toHaveLength(1);
      expect(result.deckPages[0].title).toBe('Math');
      expect(result.deckPages[0].children).toHaveLength(1);

      const toggle = getToggle(result.deckPages[0].children);
      expect(toggle.heading_3.rich_text[0].plain_text).toBe('What is 2+2?');
      expect(toggle.heading_3.is_toggleable).toBe(true);
      expect(toggle.heading_3.children).toHaveLength(1);
      const firstChild = toggle.heading_3.children[0];
      expect(firstChild.type).toBe('paragraph');
      if (firstChild.type === 'paragraph') {
        expect(firstChild.paragraph.rich_text[0].plain_text).toBe('Four');
      }
    });

    it('strips HTML tags from fields', () => {
      const notes = new Map<number, Note>([
        [
          100,
          {
            id: 100,
            mid: 1,
            tags: '',
            fields: ['<b>Bold</b> text', '<i>Italic</i> answer'],
          },
        ],
      ]);
      const collection = buildCollection({ notes });
      const result = service.transform(collection, new Map(), 10000);

      const toggle = getToggle(result.deckPages[0].children);
      expect(toggle.heading_3.rich_text[0].plain_text).toBe('Bold text');
    });

    it('preserves bold formatting from HTML', () => {
      const notes = new Map<number, Note>([
        [
          100,
          {
            id: 100,
            mid: 1,
            tags: '',
            fields: ['Front', '<b>Important</b> detail'],
          },
        ],
      ]);
      const collection = buildCollection({ notes });
      const result = service.transform(collection, new Map(), 10000);

      const backChildren = getToggle(result.deckPages[0].children).heading_3
        .children;
      const firstChild = backChildren[0];
      expect(firstChild.type).toBe('paragraph');
      if (firstChild.type === 'paragraph') {
        const boldSegment = firstChild.paragraph.rich_text.find(
          (seg) => seg.annotations?.bold === true
        );
        expect(boldSegment).toBeDefined();
        expect(boldSegment!.plain_text).toBe('Important');
      }
    });

    it('preserves italic formatting from HTML', () => {
      const notes = new Map<number, Note>([
        [
          100,
          {
            id: 100,
            mid: 1,
            tags: '',
            fields: ['Front', '<i>Emphasis</i> here'],
          },
        ],
      ]);
      const collection = buildCollection({ notes });
      const result = service.transform(collection, new Map(), 10000);

      const backChildren = getToggle(result.deckPages[0].children).heading_3
        .children;
      const firstChild = backChildren[0];
      expect(firstChild.type).toBe('paragraph');
      if (firstChild.type === 'paragraph') {
        const italicSegment = firstChild.paragraph.rich_text.find(
          (seg) => seg.annotations?.italic === true
        );
        expect(italicSegment).toBeDefined();
        expect(italicSegment!.plain_text).toBe('Emphasis');
      }
    });

    it('creates nested deck pages for sub-decks', () => {
      const decks = new Map<number, Deck>([
        [10, { id: 10, name: 'Bio' }],
        [11, { id: 11, name: 'Bio::Cell' }],
      ]);
      const cards: Card[] = [{ id: 1000, nid: 100, did: 11, ord: 0 }];
      const collection = buildCollection({ decks, cards });
      const result = service.transform(collection, new Map(), 10000);

      expect(result.deckPages).toHaveLength(1);
      expect(result.deckPages[0].title).toBe('Bio');
      expect(result.deckPages[0].subDecks).toHaveLength(1);
      expect(result.deckPages[0].subDecks[0].title).toBe('Cell');
    });

    it('adds tags as italic text at bottom of toggle', () => {
      const notes = new Map<number, Note>([
        [100, { id: 100, mid: 1, tags: ' math algebra ', fields: ['Q', 'A'] }],
      ]);
      const collection = buildCollection({ notes });
      const result = service.transform(collection, new Map(), 10000);

      const toggleChildren = getToggle(result.deckPages[0].children).heading_3
        .children;
      const tagBlock = toggleChildren[toggleChildren.length - 1];
      expect(tagBlock.type).toBe('paragraph');
      if (tagBlock.type === 'paragraph') {
        expect(tagBlock.paragraph.rich_text[0].annotations.italic).toBe(true);
        expect(tagBlock.paragraph.rich_text[0].plain_text).toContain('math');
      }
    });

    it('handles cloze notes by stripping markers in summary', () => {
      const clozeNoteType: NoteType = {
        id: 2,
        name: 'Cloze',
        type: 1,
        css: '',
        fields: [
          { name: 'Text', ord: 0 },
          { name: 'Extra', ord: 1 },
        ],
        templates: [
          {
            name: 'Cloze',
            ord: 0,
            qfmt: '{{cloze:Text}}',
            afmt: '{{cloze:Text}}',
          },
        ],
      };
      const notes = new Map<number, Note>([
        [
          100,
          {
            id: 100,
            mid: 2,
            tags: '',
            fields: ['{{c1::Paris}} is the capital of France', ''],
          },
        ],
      ]);
      const noteTypes = new Map<number, NoteType>([[2, clozeNoteType]]);
      const collection = buildCollection({ noteTypes, notes });
      const result = service.transform(collection, new Map(), 10000);

      const toggle = getToggle(result.deckPages[0].children);
      expect(toggle.heading_3.rich_text[0].plain_text).toBe(
        'Paris is the capital of France'
      );
    });

    it('decodes HTML entities like &nbsp;', () => {
      const notes = new Map<number, Note>([
        [100, { id: 100, mid: 1, tags: '', fields: ['3 x 4 =&nbsp;', '12'] }],
      ]);
      const collection = buildCollection({ notes });
      const result = service.transform(collection, new Map(), 10000);

      const toggle = getToggle(result.deckPages[0].children);
      expect(toggle.heading_3.rich_text[0].plain_text).toBe('3 x 4 = ');
      expect(toggle.heading_3.rich_text[0].plain_text).not.toContain('&nbsp;');
    });

    it('decodes numeric and named HTML entities in back fields', () => {
      const notes = new Map<number, Note>([
        [
          100,
          {
            id: 100,
            mid: 1,
            tags: '',
            fields: ['Q', '5 &gt; 3 &amp; 2 &lt; 4'],
          },
        ],
      ]);
      const collection = buildCollection({ notes });
      const result = service.transform(collection, new Map(), 10000);

      const backChildren = getToggle(result.deckPages[0].children).heading_3
        .children;
      const firstChild = backChildren[0];
      expect(firstChild.type).toBe('paragraph');
      if (firstChild.type === 'paragraph') {
        expect(firstChild.paragraph.rich_text[0].plain_text).toBe(
          '5 > 3 & 2 < 4'
        );
      }
    });

    it('strips media refs from text in text-heavy front fields', () => {
      const notes = new Map<number, Note>([
        [
          100,
          {
            id: 100,
            mid: 1,
            tags: '',
            fields: [
              'What is this? <img src="image.png"> Identify the object shown above.',
              'Answer [sound:audio.mp3]',
            ],
          },
        ],
      ]);
      const collection = buildCollection({ notes });
      const result = service.transform(collection, new Map(), 10000);

      const toggle = result.deckPages[0].children[0];
      expect(toggle.type).toBe('heading_3');
      if (toggle.type === 'heading_3') {
        expect(toggle.heading_3.rich_text[0].plain_text).toContain(
          'What is this?'
        );
      }
    });

    it('uses image-first layout when front is image-only', () => {
      const noteType: NoteType = {
        id: 3,
        name: 'Image Occlusion',
        type: 0,
        css: '',
        fields: [
          { name: 'Picture', ord: 0 },
          { name: 'Country', ord: 1 },
          { name: 'Notes', ord: 2 },
        ],
        templates: [{ name: 'Card 1', ord: 0, qfmt: '', afmt: '' }],
      };
      const notes = new Map<number, Note>([
        [
          100,
          {
            id: 100,
            mid: 3,
            tags: '',
            fields: [
              '<img src="bollard.jpg">',
              'France',
              'French bollards are super thick',
            ],
          },
        ],
      ]);
      const collection = buildCollection({
        noteTypes: new Map([[3, noteType]]),
        notes,
        cards: [{ id: 1000, nid: 100, did: 10, ord: 0 }],
      });
      const result = service.transform(collection, new Map(), 10000);

      const blocks = result.deckPages[0].children;
      expect(blocks[0].type).toBe('divider');
      const answerBlock = blocks.find((b) => b.type === 'heading_3');
      expect(answerBlock).toBeDefined();
      if (answerBlock?.type === 'heading_3') {
        const textChildren = answerBlock.heading_3.children.filter(
          (c) => c.type === 'paragraph'
        );
        const texts = textChildren.map((c) =>
          c.type === 'paragraph' ? c.paragraph.rich_text[0]?.plain_text : ''
        );
        expect(texts).toContain('France');
      }
    });

    it('uses image-first layout for image-only front fields', () => {
      const noteType: NoteType = {
        id: 3,
        name: 'Bollard',
        type: 0,
        css: '',
        fields: [
          { name: 'Picture', ord: 0 },
          { name: 'Country', ord: 1 },
          { name: 'Notes', ord: 2 },
        ],
        templates: [{ name: 'Card 1', ord: 0, qfmt: '', afmt: '' }],
      };
      const notes = new Map<number, Note>([
        [
          100,
          {
            id: 100,
            mid: 3,
            tags: '',
            fields: [
              '<img src="bollard.jpg">',
              'France',
              'French bollards are super thick',
            ],
          },
        ],
      ]);
      const mediaUrlMap = new Map([
        ['bollard.jpg', 'https://cdn.example.com/bollard.jpg'],
      ]);
      const collection = buildCollection({
        noteTypes: new Map([[3, noteType]]),
        notes,
        cards: [{ id: 1000, nid: 100, did: 10, ord: 0 }],
      });
      const result = service.transform(collection, mediaUrlMap, 10000);

      const blocks = result.deckPages[0].children;
      expect(blocks[0].type).toBe('divider');
      expect(blocks[1].type).toBe('image');
      if (blocks[1].type === 'image' && blocks[1].image.type === 'external') {
        expect(blocks[1].image.external.url).toBe(
          'https://cdn.example.com/bollard.jpg'
        );
      }
      expect(blocks[2].type).toBe('heading_3');
      if (blocks[2].type === 'heading_3') {
        expect(blocks[2].heading_3.is_toggleable).toBe(true);
        expect(blocks[2].heading_3.rich_text[0].plain_text).toBe('Answer');
        const answerChildren = blocks[2].heading_3.children;
        const texts = answerChildren
          .filter((c) => c.type === 'paragraph')
          .map(
            (c) =>
              (
                c as {
                  type: 'paragraph';
                  paragraph: { rich_text: { plain_text: string }[] };
                }
              ).paragraph.rich_text[0]?.plain_text
          );
        expect(texts).toContain('France');
        expect(texts).toContain('French bollards are super thick');
      }
    });

    it('uses named field label for single back-field image-first cards', () => {
      const noteType: NoteType = {
        id: 4,
        name: 'Flag Quiz',
        type: 0,
        css: '',
        fields: [
          { name: 'Flag', ord: 0 },
          { name: 'Country', ord: 1 },
        ],
        templates: [{ name: 'Card 1', ord: 0, qfmt: '', afmt: '' }],
      };
      const notes = new Map<number, Note>([
        [
          100,
          {
            id: 100,
            mid: 4,
            tags: '',
            fields: ['<img src="flag.png">', 'Japan'],
          },
        ],
      ]);
      const collection = buildCollection({
        noteTypes: new Map([[4, noteType]]),
        notes,
        cards: [{ id: 1000, nid: 100, did: 10, ord: 0 }],
      });
      const result = service.transform(
        collection,
        new Map([['flag.png', 'https://cdn.example.com/flag.png']]),
        10000
      );

      const toggleBlock = result.deckPages[0].children[2];
      expect(toggleBlock.type).toBe('heading_3');
      if (toggleBlock.type === 'heading_3') {
        expect(toggleBlock.heading_3.rich_text[0].plain_text).toBe('Country');
      }
    });

    it('keeps toggle layout for text-first notes with images', () => {
      const notes = new Map<number, Note>([
        [
          100,
          {
            id: 100,
            mid: 1,
            tags: '',
            fields: [
              'What does this bollard look like? <img src="hint.jpg">',
              'France',
            ],
          },
        ],
      ]);
      const collection = buildCollection({ notes });
      const result = service.transform(
        collection,
        new Map([['hint.jpg', 'https://cdn.example.com/hint.jpg']]),
        10000
      );

      const block = result.deckPages[0].children[0];
      expect(block.type).toBe('heading_3');
      if (block.type === 'heading_3') {
        expect(block.heading_3.rich_text[0].plain_text).toBe(
          'What does this bollard look like?'
        );
      }
    });

    it('emits image blocks in image-first layout when media URL map is provided', () => {
      const notes = new Map<number, Note>([
        [
          100,
          {
            id: 100,
            mid: 1,
            tags: '',
            fields: ['<img src="bollard.jpg">', 'France'],
          },
        ],
      ]);
      const mediaUrlMap = new Map([
        ['bollard.jpg', 'https://cdn.example.com/imports/job-1/bollard.jpg'],
      ]);
      const collection = buildCollection({ notes });
      const result = service.transform(collection, mediaUrlMap, 10000);

      const blocks = result.deckPages[0].children;
      const imageBlock = blocks.find((b) => b.type === 'image');
      expect(imageBlock).toBeDefined();
      if (
        imageBlock?.type === 'image' &&
        imageBlock.image.type === 'external'
      ) {
        expect(imageBlock.image.external.url).toBe(
          'https://cdn.example.com/imports/job-1/bollard.jpg'
        );
      }
    });

    it('returns totalNotes count', () => {
      const notes = new Map<number, Note>([
        [100, { id: 100, mid: 1, tags: '', fields: ['Q1', 'A1'] }],
        [101, { id: 101, mid: 1, tags: '', fields: ['Q2', 'A2'] }],
      ]);
      const cards: Card[] = [
        { id: 1000, nid: 100, did: 10, ord: 0 },
        { id: 1001, nid: 101, did: 10, ord: 0 },
      ];
      const collection = buildCollection({ notes, cards });
      const result = service.transform(collection, new Map(), 10000);

      expect(result.totalNotes).toBe(2);
    });

    function buildLargeCollection(noteCount: number) {
      const notes = new Map<number, Note>();
      const cards: Card[] = [];
      for (let i = 0; i < noteCount; i++) {
        notes.set(i, { id: i, mid: 1, tags: '', fields: [`Q${i}`, `A${i}`] });
        cards.push({ id: 10000 + i, nid: i, did: 10, ord: 0 });
      }
      return buildCollection({ notes, cards });
    }

    interface PageShape {
      children: unknown[];
      subDecks: PageShape[];
    }

    function countNotesInPage(page: PageShape): number {
      return (
        page.children.length +
        page.subDecks.reduce((sum, sub) => sum + countNotesInPage(sub), 0)
      );
    }

    it('truncates to the first maxNotes notes instead of failing', () => {
      const collection = buildLargeCollection(1005);

      const result = service.transform(collection, new Map(), 1000);

      expect(result.truncated).toBe(true);
      expect(result.totalNotes).toBe(1005);
      expect(result.importedNotes).toBe(1000);
      expect(countNotesInPage(result.deckPages[0])).toBe(1000);
      const firstToggle = getToggle(result.deckPages[0].children, 0);
      expect(firstToggle.heading_3.rich_text[0].plain_text).toBe('Q0');
      const lastToggle = getToggle(result.deckPages[0].children, 999);
      expect(lastToggle.heading_3.rich_text[0].plain_text).toBe('Q999');
    });

    it('truncates identically across repeated calls', () => {
      const collection = buildLargeCollection(1003);

      const first = service.transform(collection, new Map(), 1000);
      const second = service.transform(collection, new Map(), 1000);

      expect(second.deckPages).toEqual(first.deckPages);
    });

    it('does not truncate exactly at the cap', () => {
      const collection = buildLargeCollection(1000);

      const result = service.transform(collection, new Map(), 1000);

      expect(result.truncated).toBe(false);
      expect(result.importedNotes).toBe(1000);
      expect(result.totalNotes).toBe(1000);
    });

    it('skips empty decks like Default', () => {
      const decks = new Map<number, Deck>([
        [1, { id: 1, name: 'Default' }],
        [10, { id: 10, name: 'Spanish' }],
      ]);
      const notes = new Map<number, Note>([
        [100, { id: 100, mid: 1, tags: '', fields: ['Hola', 'Hello'] }],
      ]);
      const cards: Card[] = [{ id: 1000, nid: 100, did: 10, ord: 0 }];
      const collection = buildCollection({ decks, notes, cards });
      const result = service.transform(collection, new Map(), 10000);

      expect(result.deckPages).toHaveLength(1);
      expect(result.deckPages[0].title).toBe('Spanish');
    });

    it('handles multiple decks', () => {
      const decks = new Map<number, Deck>([
        [10, { id: 10, name: 'Math' }],
        [20, { id: 20, name: 'History' }],
      ]);
      const notes = new Map<number, Note>([
        [100, { id: 100, mid: 1, tags: '', fields: ['Q1', 'A1'] }],
        [101, { id: 101, mid: 1, tags: '', fields: ['Q2', 'A2'] }],
      ]);
      const cards: Card[] = [
        { id: 1000, nid: 100, did: 10, ord: 0 },
        { id: 1001, nid: 101, did: 20, ord: 0 },
      ];
      const collection = buildCollection({ decks, notes, cards });
      const result = service.transform(collection, new Map(), 10000);

      expect(result.deckPages).toHaveLength(2);
      const deckNames = result.deckPages.map((d) => d.title);
      expect(deckNames).toContain('Math');
      expect(deckNames).toContain('History');
    });

    it('handles custom note types with many fields using image-first layout', () => {
      const customType: NoteType = {
        id: 5,
        name: 'GeoGuessr Card',
        type: 0,
        css: '',
        fields: [
          { name: 'Picture', ord: 0 },
          { name: 'Country', ord: 1 },
          { name: 'AlsoFoundIn', ord: 2 },
          { name: 'Notes', ord: 3 },
        ],
        templates: [{ name: 'Card 1', ord: 0, qfmt: '', afmt: '' }],
      };
      const notes = new Map<number, Note>([
        [
          100,
          {
            id: 100,
            mid: 5,
            tags: '',
            fields: [
              '<img src="pic.jpg">',
              'Austria, Slovenia',
              'Similar Design: Montenegro has the same design',
              'note: Snowpole on right found in Andorra',
            ],
          },
        ],
      ]);
      const collection = buildCollection({
        noteTypes: new Map([[5, customType]]),
        notes,
        cards: [{ id: 1000, nid: 100, did: 10, ord: 0 }],
      });
      const result = service.transform(collection, new Map(), 10000);

      const blocks = result.deckPages[0].children;
      expect(blocks[0].type).toBe('divider');

      const answerBlock = blocks.find((b) => b.type === 'heading_3');
      expect(answerBlock).toBeDefined();
      if (answerBlock?.type === 'heading_3') {
        expect(answerBlock.heading_3.rich_text[0].plain_text).toBe('Answer');
        const textChildren = answerBlock.heading_3.children.filter(
          (c) => c.type === 'paragraph'
        );
        const texts = textChildren.map((c) =>
          c.type === 'paragraph' ? c.paragraph.rich_text[0]?.plain_text : ''
        );
        expect(texts).toContain('Austria, Slovenia');
        expect(texts).toContain(
          'Similar Design: Montenegro has the same design'
        );
        expect(texts).toContain('note: Snowpole on right found in Andorra');
      }
    });
  });
});

describe('buildTruncationNoticeBlocks', () => {
  function plainText(blocks: ReturnType<typeof buildTruncationNoticeBlocks>) {
    return blocks
      .filter((b) => b.type === 'paragraph')
      .map((b) =>
        b.type === 'paragraph'
          ? b.paragraph.rich_text.map((s) => s.plain_text).join('')
          : ''
      );
  }

  it('tells free users the cap and where to upgrade, ending with a divider', () => {
    const blocks = buildTruncationNoticeBlocks({
      importedNotes: 1000,
      totalNotes: 5864,
      isPaying: false,
      paidCap: 10000,
    });

    const [headline, upsell] = plainText(blocks);
    expect(headline).toBe(
      'Imported the first 1000 of 5864 notes. The free plan stops at 1000 notes per import.'
    );
    expect(upsell).toBe(
      'Paid plans import up to 10 000 notes. Upgrade at 2anki.net/pricing'
    );
    const first = blocks[0];
    expect(first.type).toBe('paragraph');
    if (first.type === 'paragraph') {
      expect(first.paragraph.rich_text[0].annotations.bold).toBe(true);
    }
    expect(blocks[blocks.length - 1].type).toBe('divider');
  });

  it('tells paying users the remaining count with no upgrade pitch', () => {
    const blocks = buildTruncationNoticeBlocks({
      importedNotes: 10000,
      totalNotes: 12000,
      isPaying: true,
      paidCap: 10000,
    });

    const [headline] = plainText(blocks);
    expect(headline).toBe(
      'Imported the first 10 000 of 12 000 notes. 10 000 notes is the largest import 2anki supports — the remaining 2000 notes were not imported.'
    );
    expect(plainText(blocks)).toHaveLength(1);
    expect(headline).not.toContain('pricing');
    expect(blocks[blocks.length - 1].type).toBe('divider');
  });
});
