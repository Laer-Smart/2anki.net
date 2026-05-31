import BlockCode from './BlockCode';
import CardOption from '../../../lib/parser/Settings/CardOption';
import BlockHandler from '../BlockHandler/BlockHandler';
import CustomExporter from '../../../lib/parser/exporters/CustomExporter';
import Workspace from '../../../lib/parser/WorkSpace';
import MockNotionAPI from '../_mock/MockNotionAPI';
import { setupTests } from '../../../test/configure-jest';

beforeEach(() => setupTests());

const makeHandler = () => {
  const api = new MockNotionAPI('', '');
  const exporter = new CustomExporter('', new Workspace(true, 'fs').location);
  return new BlockHandler(exporter, api, new CardOption({}));
};

const makeCodeBlock = (richText: { plain_text: string }[]) =>
  ({
    id: 'block-code-test',
    type: 'code' as const,
    object: 'block' as const,
    parent: { type: 'page_id' as const, page_id: 'page-id' },
    created_time: '',
    last_edited_time: '',
    created_by: { object: 'user' as const, id: 'user-id' },
    last_edited_by: { object: 'user' as const, id: 'user-id' },
    has_children: false,
    archived: false,
    in_trash: false,
    code: {
      rich_text: richText.map((t) => ({
        type: 'text' as const,
        text: { content: t.plain_text, link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default' as const,
        },
        plain_text: t.plain_text,
        href: null,
      })),
      language: 'plain text' as const,
      caption: [],
    },
  });

describe('BlockCode — newline preservation', () => {
  it('preserves newlines within a single rich-text item in the rendered pre/code', () => {
    const block = makeCodeBlock([{ plain_text: 'line one\nline two\nline three' }]);
    const html = BlockCode(block, makeHandler());
    expect(html).toContain('line one');
    expect(html).toContain('line two');
    expect(html).toContain('line three');
    expect(html).toContain('\n');
  });

  it('preserves newlines across multiple rich-text items', () => {
    const block = makeCodeBlock([
      { plain_text: 'def foo():\n' },
      { plain_text: '    return 1' },
    ]);
    const html = BlockCode(block, makeHandler());
    expect(html).toContain('def foo():');
    expect(html).toContain('    return 1');
    expect(html).toContain('\n');
  });

  it('renders a pre element containing a code element', () => {
    const block = makeCodeBlock([{ plain_text: 'hello' }]);
    const html = BlockCode(block, makeHandler());
    expect(html).toMatch(/^<pre/);
    expect(html).toContain('<code>');
  });

  it('applies the code class so the card template styles the block', () => {
    const block = makeCodeBlock([{ plain_text: 'hello' }]);
    const html = BlockCode(block, makeHandler());
    expect(html).toContain('class="code"');
    expect(html).not.toContain('code}');
  });
});
