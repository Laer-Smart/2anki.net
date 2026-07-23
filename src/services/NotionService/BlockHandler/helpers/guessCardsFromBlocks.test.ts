import { guessCardsFromBlocks } from './guessCardsFromBlocks';
import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';

function richText(content: string) {
  return {
    type: 'text' as const,
    text: { content, link: null },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: 'default' as const,
    },
    plain_text: content,
    href: null,
  };
}

function block(type: string, content: string): GetBlockResponse {
  return {
    object: 'block',
    id: `${type}-${content.slice(0, 8)}`,
    parent: { type: 'page_id', page_id: 'page-1' },
    created_time: '',
    last_edited_time: '',
    created_by: { object: 'user', id: 'u' },
    last_edited_by: { object: 'user', id: 'u' },
    has_children: false,
    archived: false,
    in_trash: false,
    type,
    [type]: { rich_text: [richText(content)], color: 'default' },
  } as unknown as GetBlockResponse;
}

describe('guessCardsFromBlocks', () => {
  it('returns no cards for an empty block list', () => {
    expect(guessCardsFromBlocks([])).toEqual([]);
  });

  it('pairs a heading with its following content as front and back', () => {
    const blocks = [
      block('heading_2', 'What is photosynthesis?'),
      block('paragraph', 'The process by which plants convert sunlight.'),
      block('heading_2', 'What is mitosis?'),
      block('paragraph', 'Cell division producing two identical cells.'),
    ];

    const notes = guessCardsFromBlocks(blocks);

    expect(notes).toHaveLength(2);
    expect(notes[0].name).toContain('photosynthesis');
    expect(notes[0].back).toContain('plants convert sunlight');
    expect(notes[1].name).toContain('mitosis');
    expect(notes[1].back).toContain('identical cells');
  });

  it('normalizes heading_1 and heading_3 to the same card shape', () => {
    const notes = guessCardsFromBlocks([
      block('heading_1', 'Top level term'),
      block('paragraph', 'Its definition.'),
      block('heading_3', 'Nested term'),
      block('paragraph', 'Another definition.'),
    ]);

    expect(notes).toHaveLength(2);
    expect(notes[0].name).toContain('Top level term');
    expect(notes[1].name).toContain('Nested term');
  });

  it('extracts Q:/A: shaped paragraphs when there are no headings', () => {
    const notes = guessCardsFromBlocks([
      block('paragraph', 'Q: What is the powerhouse of the cell?'),
      block('paragraph', 'A: The mitochondria.'),
    ]);

    expect(notes).toHaveLength(1);
    expect(notes[0].name).toContain('powerhouse');
    expect(notes[0].back).toContain('mitochondria');
  });

  it('extracts term::definition paragraphs', () => {
    const notes = guessCardsFromBlocks([
      block('paragraph', 'Photosynthesis::Converting light to glucose'),
    ]);

    expect(notes).toHaveLength(1);
    expect(notes[0].name).toContain('Photosynthesis');
    expect(notes[0].back).toContain('glucose');
  });

  it('returns no cards for prose with no guessable structure', () => {
    const notes = guessCardsFromBlocks([
      block('paragraph', 'This is just a paragraph of notes.'),
      block('paragraph', 'And another one with no card shape at all.'),
    ]);

    expect(notes).toEqual([]);
  });

  it('skips a heading that has no following content', () => {
    const notes = guessCardsFromBlocks([
      block('heading_2', 'Question without a body'),
    ]);

    expect(notes).toEqual([]);
  });

  it('ignores blocks that carry no rich_text (dividers, child pages)', () => {
    const divider = {
      object: 'block',
      id: 'div-1',
      type: 'divider',
      divider: {},
      has_children: false,
      archived: false,
      in_trash: false,
      parent: { type: 'page_id', page_id: 'page-1' },
      created_time: '',
      last_edited_time: '',
      created_by: { object: 'user', id: 'u' },
      last_edited_by: { object: 'user', id: 'u' },
    } as unknown as GetBlockResponse;

    const notes = guessCardsFromBlocks([
      block('heading_2', 'A term'),
      divider,
      block('paragraph', 'Its definition.'),
    ]);

    expect(notes).toHaveLength(1);
    expect(notes[0].name).toContain('A term');
    expect(notes[0].back).toContain('definition');
  });
});
