import path from 'path';
import fs from 'fs';

import { setupTests } from '../../test/configure-jest';
import { getDeck } from '../../test/test-utils';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Workspace from './WorkSpace';

beforeEach(() => setupTests());

test('deck style includes Notion highlight color rules for file uploads', async () => {
  const html = `<html><head><title>Colors</title><style>body { font-size: 16px; }</style></head>
<body><article>
<h2 class="toggle"><summary>Q</summary><div>
  Answer with <span class="highlight-red">red highlight</span>
</div></h2>
</article></body></html>`;

  const workspace = new Workspace(true, 'fs');
  const parser = new DeckParser({
    name: 'colors.html',
    settings: new CardOption({ cherry: 'false' }),
    files: [{ name: 'colors.html', contents: html }],
    noLimits: true,
    workspace,
  });
  await parser.build(workspace);

  const style = parser.payload[0].style ?? '';
  expect(style).toContain('.highlight-red');
});

test('Toggle Headings', async () => {
  const deck = await getDeck(
    'Toggle Hea 0e02b 2.html',
    new CardOption({ cherry: 'false' })
  );
  expect(deck.cards.length).toBeGreaterThan(0);
});

test('Grouped cloze deletions', async () => {
  const deck = await getDeck(
    'Grouped Cloze Deletions fbf856ad7911423dbef0bfd3e3c5ce5c 3.html',
    new CardOption({
      cherry: 'false',
      cloze: 'true',
      reversed: 'true',
      'basic-reversed': 'true',
    })
  );
  expect(deck.name).toBe('Grouped Cloze Deletions');
  expect(deck.cards.length).toBe(20);
});

test('Cloze Deletions', async () => {
  const deck = await getDeck(
    'Some Cloze Deletions 1a118169ada841a99a9aaccc7eaa6775.html',
    new CardOption({
      cherry: 'false',
      reversed: 'true',
      'basic-reversed': 'true',
    })
  );
  expect(deck.cards[0].back).toBe(
    "<div class='toggle'>{{c2::Canberra}} was founded in {{c1::1913}}.</div>"
  );
  expect(deck.cards[1].back).toBe(
    "<div class='toggle'>{{c1::Canberra::city}} was founded in {{c2::1913::year}}</div>"
  );
  expect(deck.cards[2].back).toBe(
    "<div class='toggle'>{{c1::Canberra::city}} was founded in {{c2::1913}}</div>"
  );
  expect(deck.cards[3].back).toBe(
    "<div class='toggle'>{{c1::This}} is a {{c2::cloze deletion}}</div>"
  );
  expect(deck.cards[4].back).toBe(
    "<div class='toggle'>{{c2::Canberra}} was founded in {{c1::1913}}.</div>"
  );
  expect(deck.cards[5].back).toEqual(
    "<div class='toggle'>{{c1::Canberra::city}} was founded in {{c2::1913::year}}</div>"
  );
});

test('Colours', async () => {
  const deck = await getDeck(
    'Colours 0519bf7e86d84ee4ba710c1b7ff7438e.html',
    new CardOption({ cherry: 'false' })
  );
  expect(deck.cards[0].back.includes('block-color')).toBe(true);
});

test.skip('HTML Regression Test', (t) => {
  t.fail(
    'please automate HTML regression check. Use this page https://www.notion.so/HTML-test-4aa53621a84a4660b69e9953f3938685.'
  );
});

test('Nested Toggles', async () => {
  const deck = await getDeck(
    'Nested Toggles.html',
    new CardOption({
      cherry: 'true',
      reversed: 'true',
      'basic-reversed': 'true',
    })
  );
  expect(deck.cards.length).toBe(12);
});

test('Global Tags', async () => {
  const deck = await getDeck(
    'Global Tag Support.html',
    new CardOption({ tags: 'true', cherry: 'false' })
  );
  expect(deck.cards[0].tags.includes('global')).toBe(true);
});

test('global tags per file are preserved in multi-file uploads', async () => {
  const fixtureDir = path.join(__dirname, '../../test/fixtures');
  const fileAContents = fs.readFileSync(path.join(fixtureDir, 'multi-file-tags-a.html')).toString();
  const fileBContents = fs.readFileSync(path.join(fixtureDir, 'multi-file-tags-b.html')).toString();

  const files = [
    { name: 'multi-file-tags-a.html', contents: fileAContents },
    { name: 'multi-file-tags-b.html', contents: fileBContents },
  ];

  const workspace = new Workspace(true, 'fs');
  const settings = new CardOption({ tags: 'true', cherry: 'false' });
  const parser = new DeckParser({
    name: 'multi-file-tags-a.html',
    settings,
    files,
    noLimits: true,
    workspace,
  });

  const decks = parser.handleHTML('multi-file-tags-b.html', fileBContents, '', parser.payload);
  parser.payload = decks;

  expect(parser.payload.length).toBe(2);

  parser.customExporter.save = jest.fn().mockResolvedValue('');
  await parser.build(workspace);

  const deckA = parser.payload[0];
  const deckB = parser.payload[1];

  expect(deckA.cards.length).toBe(1);
  expect(deckB.cards.length).toBe(1);

  expect(deckA.cards[0].tags).toContain('alpha-tag');
  expect(deckA.cards[0].tags).not.toContain('beta-tag');

  expect(deckB.cards[0].tags).toContain('beta-tag');
  expect(deckB.cards[0].tags).not.toContain('alpha-tag');
});

test.todo('Input Cards ');
test.todo('Test Basic Card');

test('Markdown empty deck', async () => {
  const deck = await getDeck(
    'empty-deck.md',
    new CardOption({
      'markdown-nested-bullet-points': 'true',
    })
  );
  expect(deck.name).toBe('Empty Deck');
  expect(deck.cards.length).toBe(0);
});

test('Markdown nested bullet points', async () => {
  const deck = await getDeck(
    'simple-deck.md',
    new CardOption({
      'markdown-nested-bullet-points': 'true',
      reversed: 'false',
      'basic-reversed': 'false',
    })
  );

  expect(deck.name).toBe('Simple Deck');

  expect(deck.cards[0].name).toBe(
    '<ul>\n<li>' + 'What is the capital of Kenya?' + '</li>\n</ul>\n'
  );
  expect(deck.cards[0].back).toBe('<p>Nairobi</p>\n');
  expect(deck.cards[1].name).toBe(
    '<ul>\n<li>' + 'What is the capital of Norway' + '</li>\n</ul>\n'
  );
  expect(deck.cards[1].back).toBe('<p>Oslo</p>\n');
  expect(deck.cards[2].name).toBe(
    '<ul>\n<li>' + 'What is the capital of Sweden' + '</li>\n</ul>\n'
  );
  expect(deck.cards[2].back).toBe('<p>Stockholm</p>\n');
  expect(deck.cards[3].name).toBe(
    '<ul>\n<li>' + 'What is the capital of Finland' + '</li>\n</ul>\n'
  );
  expect(deck.cards[3].back).toBe('<p>Helsinki</p>\n');
  expect(deck.cards.length).toBe(4);
});

test('Markdown reversed cards keep numeric sort order', async () => {
  const fixturePath = path.join(__dirname, '../../test/fixtures/simple-deck.md');
  const contents = fs.readFileSync(fixturePath).toString();
  const workspace = new Workspace(true, 'fs');
  const parser = new DeckParser({
    name: 'simple-deck.md',
    settings: new CardOption({
      'markdown-nested-bullet-points': 'true',
      reversed: 'true',
      'basic-reversed': 'false',
    }),
    files: [{ name: 'simple-deck.md', contents }],
    noLimits: true,
    workspace,
  });

  parser.customExporter.save = jest.fn().mockResolvedValue('');
  await parser.build(workspace);

  const deck = parser.payload[0];

  expect(deck.cards.map((card) => card.number)).toEqual([0, 1, 2, 3]);
  expect(deck.cards).not.toContainEqual(expect.objectContaining({ number: -1 }));
});

test('Markdown nested bullets auto-detected without explicit setting', () => {
  const fixturePath = path.join(__dirname, '../../test/fixtures/notion-nested-bullets.md');
  const contents = fs.readFileSync(fixturePath).toString();
  const info = [{ name: 'notion-nested-bullets.md', contents }];
  const parser = new DeckParser({
    name: 'notion-nested-bullets.md',
    settings: new CardOption({ reversed: 'false', 'basic-reversed': 'false' }),
    files: info,
    noLimits: true,
    workspace: new Workspace(true, 'fs'),
  });
  expect(parser.payload.length).toBe(1);
  expect(parser.payload[0].cards.length).toBe(2);
});

test('Notion new export: display:contents and fragmented ul.toggle', async () => {
  const deck = await getDeck(
    'notion-new-export-nested.html',
    new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false' })
  );

  expect(deck.cards.length).toBe(1);
  expect(deck.cards[0].name).toContain('Parent');
  expect(deck.cards[0].back).toContain('Child');
  expect(deck.cards[0].back).toContain('details');
  expect(deck.cards[0].back).toContain('summary');
});

test('Notion new export: display:contents for toggles', async () => {
  const deck = await getDeck(
    'Toggles test 2cd7ab29a11e80bea100ed002a880884.html',
    new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false', 'enable-input': 'false' })
  );

  // Should extract 2 cards from this structure
  expect(deck.cards.length).toBe(2);
  
  // First card should be the simple Albania question
  expect(deck.cards[0].name).toContain('Albania');
  expect(deck.cards[0].back).toContain('Tirana');
  
  // Second card should be the Japan greetings with nested content
  expect(deck.cards[1].name).toBeDefined();
  expect(deck.cards[1].back).toBeDefined();
  
  // Check that nested Japanese greetings are preserved as functional toggles
  expect(deck.cards[1].back).toContain('おはようございます');
  expect(deck.cards[1].back).toContain('Ohayō gozaimasu');
  expect(deck.cards[1].back).toContain('こんにちは');
  expect(deck.cards[1].back).toContain('Konnichiwa');
  expect(deck.cards[1].back).toContain('details');
  expect(deck.cards[1].back).toContain('summary');
});

test('Notion figure image: img src uses filename not full subfolder path', async () => {
  const deck = await getDeck(
    'notion-figure-image.html',
    new CardOption({ cherry: 'false' })
  );
  expect(deck.cards.length).toBe(1);
  expect(deck.cards[0].back).toContain('src="screenshot.png"');
  expect(deck.cards[0].back).not.toContain('src="Test%20Deck/');
  expect(deck.cards[0].back).not.toContain('src="Test Deck/');
});

test('Notion figure image: embeds image when file found via backslash path (Windows ZIP)', async () => {
  const htmlPath = path.join(__dirname, '../../test/fixtures/notion-figure-image.html');
  const htmlContents = fs.readFileSync(htmlPath).toString();
  const fakeImageData = Buffer.from('fake-image-data');

  const parser = new DeckParser({
    name: 'notion-figure-image.html',
    settings: new CardOption({ cherry: 'false' }),
    files: [
      { name: 'notion-figure-image.html', contents: htmlContents },
      { name: 'Test Deck\\screenshot.png', contents: fakeImageData },
    ],
    noLimits: true,
    workspace: new Workspace(true, 'fs'),
  });
  await parser.build(new Workspace(true, 'fs'));
  const deck = parser.payload[0];

  expect(deck.cards.length).toBe(1);
  expect(deck.cards[0].media.length).toBe(1);
  expect(deck.cards[0].back).not.toContain('src="Test%20Deck/');
  expect(deck.cards[0].back).not.toContain('src="Test Deck/');
});

test('Notion new export: deeply nested toggles (3 levels)', async () => {
  const deck = await getDeck(
    'Notion Page grandchildren 2ce7ab29a11e809998e3d22ed65fc5f2.html',
    new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false', 'enable-input': 'false' })
  );

  expect(deck.cards.length).toBe(1);

  expect(deck.cards[0].name).toContain('Parent');
  expect(deck.cards[0].back).toContain('Grand child');

  expect(deck.cards[0].back).toContain('Child');
  expect(deck.cards[0].back).toContain('details');
  expect(deck.cards[0].back).toContain('summary');
});

test('nested toggle summaries are not forcibly bolded', async () => {
  const deck = await getDeck(
    'Notion Page grandchildren 2ce7ab29a11e809998e3d22ed65fc5f2.html',
    new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false', 'enable-input': 'false' })
  );

  expect(deck.cards.length).toBe(1);
  const summaryMatches = deck.cards[0].back.match(/<summary[^>]*>([\s\S]*?)<\/summary>/g) || [];
  expect(summaryMatches.length).toBeGreaterThan(0);
  for (const match of summaryMatches) {
    expect(match).not.toContain('<strong>');
  }
});

test('nested toggle summaries preserve non-empty content', async () => {
  const deck = await getDeck(
    'Notion Page grandchildren 2ce7ab29a11e809998e3d22ed65fc5f2.html',
    new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false', 'enable-input': 'false' })
  );

  expect(deck.cards.length).toBe(1);
  const back = deck.cards[0].back;
  const summaryMatches = back.match(/<summary[^>]*>([\s\S]*?)<\/summary>/g) || [];
  expect(summaryMatches.length).toBeGreaterThan(0);
  for (const match of summaryMatches) {
    const inner = match.replace(/<summary[^>]*>/g, '').replace(/<\/summary>/g, '').trim();
    expect(inner.length).toBeGreaterThan(0);
  }
});

test('Nested toggles produce one card without maxOne (new format)', async () => {
  const deck = await getDeck(
    'Notion Page grandchildren 2ce7ab29a11e809998e3d22ed65fc5f2.html',
    new CardOption({ 'max-one-toggle-per-card': 'false', cherry: 'false', all: 'true', 'enable-input': 'false' })
  );

  expect(deck.cards.length).toBe(1);
  expect(deck.cards[0].name).toContain('Parent');
  expect(deck.cards[0].back).toContain('Child');
});

test('Nested toggles produce one card without maxOne (legacy format)', async () => {
  const deck = await getDeck(
    'Nested Toggles.html',
    new CardOption({ 'max-one-toggle-per-card': 'false', cherry: 'false', all: 'true', 'enable-input': 'false' })
  );

  expect(deck.cards.length).toBe(1);
  expect(deck.cards[0].name).toContain('Parent');
  expect(deck.cards[0].back).toContain('Capital');
});

test('bullet points inside toggle are preserved (legacy format)', async () => {
  const deck = await getDeck(
    'toggle-with-bullets.html',
    new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false' })
  );

  expect(deck.cards.length).toBe(1);
  expect(deck.cards[0].name).toContain('symptoms');
  expect(deck.cards[0].back).toContain('<li');
  expect(deck.cards[0].back).toContain('Fever');
  expect(deck.cards[0].back).toContain('Cough');
  expect(deck.cards[0].back).toContain('Fatigue');
});

test('bullet points preserved alongside nested toggles (legacy format)', async () => {
  const deck = await getDeck(
    'toggle-with-bullets-and-nested-toggle.html',
    new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false' })
  );

  expect(deck.cards.length).toBe(1);
  expect(deck.cards[0].name).toContain('Cardiology');
  expect(deck.cards[0].back).toContain('Study of the heart');
  expect(deck.cards[0].back).toContain('Includes diagnosis and treatment');
  expect(deck.cards[0].back).toContain('<li');
  expect(deck.cards[0].back).not.toContain('Sub-specialties');
});

test('bullet points inside toggle are preserved (new format)', async () => {
  const deck = await getDeck(
    'notion-new-export-bullets-in-toggle.html',
    new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false' })
  );

  expect(deck.cards.length).toBe(1);
  expect(deck.cards[0].name).toContain('symptoms');
  expect(deck.cards[0].back).toContain('<li');
  expect(deck.cards[0].back).toContain('Fever');
  expect(deck.cards[0].back).toContain('Cough');
  expect(deck.cards[0].back).toContain('Fatigue');
});

test('empty paragraphs preserved as spacing in card back', async () => {
  const deck = await getDeck(
    'toggle-with-spacing.html',
    new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false' })
  );

  expect(deck.cards.length).toBe(1);
  expect(deck.cards[0].back).toContain('Sustained elevation');
  expect(deck.cards[0].back).toContain('end-organ damage');
  const emptyParagraphs = deck.cards[0].back.match(/<p[^>]*><\/p>/g);
  expect(emptyParagraphs).not.toBeNull();
});

test('refresh emoji does not reverse cards when reversed setting is off', async () => {
  const fixturePath = path.join(__dirname, '../../test/fixtures/refresh-emoji-toggle.html');
  const contents = fs.readFileSync(fixturePath).toString();
  const workspace = new Workspace(true, 'fs');
  const parser = new DeckParser({
    name: 'refresh-emoji-toggle.html',
    settings: new CardOption({ reversed: 'false', 'basic-reversed': 'false', cherry: 'false' }),
    files: [{ name: 'refresh-emoji-toggle.html', contents }],
    noLimits: true,
    workspace,
  });

  expect(parser.payload[0].cards.length).toBe(2);
  parser.customExporter.save = jest.fn().mockResolvedValue('');
  await parser.build(workspace);

  const deck = parser.payload[0];
  expect(deck.cards.length).toBe(2);
  expect(deck.cards[0].name).toContain('capital of France');
  expect(deck.cards[0].back).toContain('Paris');
  expect(deck.cards[1].name).toContain('capital of Germany');
  expect(deck.cards[1].back).toContain('Berlin');
});

describe('removeNewlinesInSVGPathAttributeD', () => {
  const newParser = () =>
    new DeckParser({
      name: 'svg-test',
      settings: new CardOption({}),
      files: [],
      noLimits: false,
      workspace: new Workspace(true, 'fs'),
    });

  it('strips newlines from a path d attribute', () => {
    const input = '<svg><path d="M0,0\nL10,10\nL20,0"/></svg>';
    expect(newParser().removeNewlinesInSVGPathAttributeD(input)).toBe(
      '<svg><path d="M0,0L10,10L20,0"/></svg>'
    );
  });

  it('trims leading and trailing whitespace inside d', () => {
    const input = '<path d="\n  M0,0 L10,10  \n"/>';
    expect(newParser().removeNewlinesInSVGPathAttributeD(input)).toBe(
      '<path d="M0,0 L10,10"/>'
    );
  });

  it('leaves d attributes on non-path elements untouched', () => {
    const input = '<text d="\nignore me\n">hi</text>';
    expect(newParser().removeNewlinesInSVGPathAttributeD(input)).toBe(input);
  });

  it('leaves sibling attributes on path untouched', () => {
    const input =
      '<path fill="red" d="M0,0\nL1,1" stroke="blue" stroke-width="2"/>';
    expect(newParser().removeNewlinesInSVGPathAttributeD(input)).toBe(
      '<path fill="red" d="M0,0L1,1" stroke="blue" stroke-width="2"/>'
    );
  });

  it('handles single-quoted d attributes', () => {
    const input = "<path d='M0,0\nL5,5'/>";
    expect(newParser().removeNewlinesInSVGPathAttributeD(input)).toBe(
      "<path d='M0,0L5,5'/>"
    );
  });

  it('processes multiple path elements in one document', () => {
    const input =
      '<svg><path d="M0,0\nL1,1"/><path d="\nM2,2\nL3,3\n"/></svg>';
    expect(newParser().removeNewlinesInSVGPathAttributeD(input)).toBe(
      '<svg><path d="M0,0L1,1"/><path d="M2,2L3,3"/></svg>'
    );
  });

  it('returns input unchanged when there are no path elements', () => {
    const input = '<div><p>no svg here</p></div>';
    expect(newParser().removeNewlinesInSVGPathAttributeD(input)).toBe(input);
  });
});

describe('notion-html-2024 regression corpus', () => {
  const fixtureDir = path.join(__dirname, '__fixtures__/notion-html-2024');
  const html = fs.readFileSync(path.join(fixtureDir, 'index.html')).toString();
  const pngPath = path.join(fixtureDir, 'notion-html-2024/pasted-screenshot.png');
  const pngContents = fs.readFileSync(pngPath);

  function buildParser(settings: CardOption) {
    return new DeckParser({
      name: 'index.html',
      settings,
      files: [
        { name: 'index.html', contents: html },
        { name: 'notion-html-2024/pasted-screenshot.png', contents: pngContents },
      ],
      noLimits: true,
      workspace: new Workspace(true, 'fs'),
    });
  }

  test('Bug 1: toggle with bulleted-list children produces one card with list items', async () => {
    const parser = buildParser(new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false' }));
    parser.customExporter.save = jest.fn().mockResolvedValue('');
    await parser.build(new Workspace(true, 'fs'));

    const symptomCard = parser.payload[0].cards.find((c) =>
      c.name.includes('influenza') || c.name.includes('symptoms')
    );
    expect(symptomCard).toBeDefined();
    expect(symptomCard!.back).toContain('<li');
    expect(symptomCard!.back).toContain('Fever');
    expect(symptomCard!.back).toContain('Myalgia');
    expect(symptomCard!.back).toContain('Cough');
  });

  test('Bug 2: pasted screenshot image is embedded into the card media list', async () => {
    const parser = buildParser(new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false' }));
    parser.customExporter.save = jest.fn().mockResolvedValue('');
    await parser.build(new Workspace(true, 'fs'));

    const imageCard = parser.payload[0].cards.find((c) =>
      c.name.includes('diagram') || c.name.includes('Diagram')
    );
    expect(imageCard).toBeDefined();
    expect(imageCard!.media.length).toBeGreaterThan(0);
    expect(imageCard!.back).toMatch(/src="[^"]+\.png"/);
    expect(imageCard!.back).not.toContain('src="notion-html-2024/pasted-screenshot.png"');
  });

  test('Bug 3: adjacent code siblings in a cloze summary produce exactly one cloze token', async () => {
    const parser = buildParser(
      new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false', cloze: 'true' })
    );
    parser.customExporter.save = jest.fn().mockResolvedValue('');
    await parser.build(new Workspace(true, 'fs'));

    const clozeCard = parser.payload[0].cards.find((c) =>
      c.name.includes('cloze concept') || c.back.includes('cloze concept')
    );
    expect(clozeCard).toBeDefined();
    const clozeTokens = (clozeCard!.name.match(/\{\{c\d+::/g) ?? []).length;
    expect(clozeTokens).toBe(1);
  });
});

describe('MCQ detection via DeckParser', () => {
  const fixtureDir = path.join(__dirname, '__fixtures__');

  function buildParserFromFixture(fixtureName: string) {
    const html = fs.readFileSync(path.join(fixtureDir, fixtureName)).toString();
    const workspace = new Workspace(true, 'fs');
    return new DeckParser({
      name: fixtureName,
      settings: new CardOption({ cherry: 'false', 'mcq-enabled': 'true' }),
      files: [{ name: fixtureName, contents: html }],
      noLimits: true,
      workspace,
    });
  }

  test('happy path: to-do checkbox produces MCQ note with correct shape', async () => {
    const parser = buildParserFromFixture('mcq-todo-checked.html');
    parser.customExporter.save = jest.fn().mockResolvedValue('');
    await parser.build(new Workspace(true, 'fs'));

    const deck = parser.payload[0];
    expect(deck.cards.length).toBe(1);
    const card = deck.cards[0];
    expect(card.mcq).toBe(true);
    expect(card.options.length).toBe(4);
    expect(card.correctIndices).toEqual([1]);
    expect(card.isValidMCQNote()).toBe(true);
    expect(deck.mcqCount).toBe(1);
    expect(deck.mcqSkippedCount).toBe(0);
  });

  test('happy path: fully-bolded bullet produces MCQ note via bold fallback', async () => {
    const parser = buildParserFromFixture('mcq-bold-fallback.html');
    parser.customExporter.save = jest.fn().mockResolvedValue('');
    await parser.build(new Workspace(true, 'fs'));

    const deck = parser.payload[0];
    expect(deck.cards.length).toBe(1);
    const card = deck.cards[0];
    expect(card.mcq).toBe(true);
    expect(card.options.length).toBe(4);
    expect(card.correctIndices).toEqual([1]);
    expect(card.isValidMCQNote()).toBe(true);
    expect(deck.mcqCount).toBe(1);
    expect(deck.mcqSkippedCount).toBe(0);
  });

  test('opt-in: mcq-enabled=false leaves an MCQ-shaped toggle as a Basic note', async () => {
    const html = fs.readFileSync(path.join(fixtureDir, 'mcq-todo-checked.html')).toString();
    const workspace = new Workspace(true, 'fs');
    const parser = new DeckParser({
      name: 'mcq-todo-checked.html',
      settings: new CardOption({ cherry: 'false' }),
      files: [{ name: 'mcq-todo-checked.html', contents: html }],
      noLimits: true,
      workspace,
    });
    parser.customExporter.save = jest.fn().mockResolvedValue('');
    await parser.build(new Workspace(true, 'fs'));

    const deck = parser.payload[0];
    expect(deck.cards.length).toBe(1);
    expect(deck.cards[0].mcq).toBe(false);
    expect(deck.mcqCount).toBe(0);
    expect(deck.mcqSkippedCount).toBe(0);
  });

  test('markdown: nested bulleted to-do produces MCQ note when mcq-enabled', async () => {
    const md = `# Using TODO\n\n- A 65-year-old man presents with crushing chest pain radiating to the jaw.\n    - [x]  Acute MI\n    - [ ]  Stable angina\n    - [ ]  GERD\n    - [ ]  Aortic dissection\n`;
    const workspace = new Workspace(true, 'fs');
    const parser = new DeckParser({
      name: 'mcq.md',
      settings: new CardOption({ cherry: 'false', 'mcq-enabled': 'true' }),
      files: [{ name: 'mcq.md', contents: md }],
      noLimits: true,
      workspace,
    });
    parser.customExporter.save = jest.fn().mockResolvedValue('');
    await parser.build(new Workspace(true, 'fs'));

    const deck = parser.payload[0];
    expect(deck.cards.length).toBe(1);
    const card = deck.cards[0];
    expect(card.mcq).toBe(true);
    expect(card.options).toEqual(['Acute MI', 'Stable angina', 'GERD', 'Aortic dissection']);
    expect(card.correctIndices).toEqual([0]);
    expect(deck.mcqCount).toBe(1);
    expect(deck.mcqSkippedCount).toBe(0);
    expect(card.back).toBe('');
  });

  test('real Notion export: fragmented ul.to-do-list under display:contents wrappers produces MCQ note', async () => {
    const parser = buildParserFromFixture('mcq-real-notion-export.html');
    parser.customExporter.save = jest.fn().mockResolvedValue('');
    await parser.build(new Workspace(true, 'fs'));

    const deck = parser.payload[0];
    expect(deck.cards.length).toBe(1);
    const card = deck.cards[0];
    expect(card.mcq).toBe(true);
    expect(card.options.length).toBe(4);
    expect(card.correctIndices).toEqual([0]);
    expect(card.isValidMCQNote()).toBe(true);
    expect(deck.mcqCount).toBe(1);
    expect(deck.mcqSkippedCount).toBe(0);
    expect(card.back).toBe('');
  });

  test('no marker: MCQ-shaped toggle with all unchecked to-dos falls back to Basic note', async () => {
    const parser = buildParserFromFixture('mcq-no-marker.html');
    parser.customExporter.save = jest.fn().mockResolvedValue('');
    await parser.build(new Workspace(true, 'fs'));

    const deck = parser.payload[0];
    expect(deck.cards.length).toBe(1);
    expect(deck.cards[0].mcq).toBe(false);
    expect(deck.mcqCount).toBe(0);
    expect(deck.mcqSkippedCount).toBe(1);
  });

  test('regression: existing non-MCQ fixture produces mcq=false on all cards', async () => {
    const fixtureHtml = fs.readFileSync(
      path.join(__dirname, '../../test/fixtures/Nested Toggles.html')
    ).toString();
    const workspace = new Workspace(true, 'fs');
    const parser = new DeckParser({
      name: 'Nested Toggles.html',
      settings: new CardOption({ cherry: 'true', reversed: 'true', 'basic-reversed': 'true' }),
      files: [{ name: 'Nested Toggles.html', contents: fixtureHtml }],
      noLimits: true,
      workspace,
    });
    parser.customExporter.save = jest.fn().mockResolvedValue('');
    await parser.build(workspace);

    const deck = parser.payload[0];
    expect(deck.cards.length).toBeGreaterThan(0);
    expect(deck.mcqCount).toBe(0);
    for (const card of deck.cards) {
      expect(card.mcq).toBe(false);
    }
  });
});

describe('heuristic markdown path — entity preservation', () => {
  // Regression: markdown uploads with non-breaking spaces (U+00A0) were
  // rendered with the literal text "&nbsp;" in the card. Showdown converts
  // U+00A0 to the `&nbsp;` HTML entity, and `embedImagesInHtml` was running
  // the result through cheerio in `xmlMode: true`. xmlMode does not know
  // `&nbsp;` (it is not a valid XML entity) and re-escapes the `&` to
  // `&amp;`, producing `&amp;nbsp;` in the .apkg which Anki renders as the
  // visible text "&nbsp;". Locking in fragment mode so this can't regress.
  const nbsp = String.fromCharCode(0xa0);

  const buildHeuristicDeck = async (markdown: string) => {
    const workspace = new Workspace(true, 'fs');
    const parser = new DeckParser({
      name: 'notes.md',
      settings: new CardOption({ cherry: 'false' }),
      files: [{ name: 'notes.md', contents: markdown }],
      noLimits: true,
      workspace,
    });
    parser.customExporter.save = jest.fn().mockResolvedValue('');
    await parser.build(workspace);
    return parser.payload[0];
  };

  it('does not double-escape &nbsp; into &amp;nbsp; in card backs', async () => {
    const markdown = [
      '## What is neonatal jaundice',
      `Jaundice is a${nbsp}**yellow discolouration of the sclerae and skin**${nbsp}due to excess bilirubin.`,
    ].join('\n');

    const deck = await buildHeuristicDeck(markdown);

    expect(deck.cards.length).toBeGreaterThan(0);
    const allHtml = deck.cards.map((c) => `${c.name}\n${c.back}`).join('\n');
    expect(allHtml).not.toContain('&amp;nbsp;');
    expect(allHtml).not.toContain('&amp;amp;');
  });

  it('preserves &nbsp; entity (or U+00A0) so Anki renders a non-breaking space', async () => {
    const markdown = [
      '## Concept',
      `prefix${nbsp}body content here`,
    ].join('\n');

    const deck = await buildHeuristicDeck(markdown);
    const back = deck.cards[0]?.back ?? '';
    const hasEntity = back.includes('&nbsp;');
    const hasChar = back.includes(nbsp);
    expect(hasEntity || hasChar).toBe(true);
  });
});
