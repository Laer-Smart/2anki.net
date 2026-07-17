import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Workspace from './WorkSpace';

const downloadMediaOrSkipMock = jest.fn<Promise<Buffer | null>, [string]>();

jest.mock('../../services/NotionService/helpers/downloadMediaOrSkip', () => ({
  __esModule: true,
  downloadMediaOrSkip: (url: string) => downloadMediaOrSkipMock(url),
}));

beforeEach(() => {
  setupTests();
  downloadMediaOrSkipMock.mockReset();
  downloadMediaOrSkipMock.mockResolvedValue(Buffer.from('fake-remote-bytes'));
});

test('extracts emoji from data-emoji attribute in Notion 2026 export', async () => {
  const html = `<html><head><title>Multi Page Support</title><meta name="data-notion-page-icon" content="🌇"/></head>
<body><article class="page sans" data-notion-page-icon="🌇"><header>
<div class="page-header-icon page-header-icon-with-cover">
  <span class="icon" data-emoji="🌇"></span>
</div>
<h1 class="page-title" dir="auto">Multi Page Support</h1></header><div class="page-body">
<ul class="toggle"><li><details open=""><summary>Test card</summary>
<p>Card answer.</p></details></li></ul>
</div></article></body></html>`;

  const workspace = new Workspace(true, 'fs');
  const parser = new DeckParser({
    name: 'test.html',
    settings: new CardOption({ cherry: 'false' }),
    files: [{ name: 'test.html', contents: html }],
    noLimits: true,
    workspace,
  });
  await parser.build(workspace);

  const deckName = parser.payload[0].name;
  expect(deckName).toBe('🌇 Multi Page Support');
});
