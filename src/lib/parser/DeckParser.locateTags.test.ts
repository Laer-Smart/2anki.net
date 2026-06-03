import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Note from './Note';
import Workspace from './WorkSpace';

beforeEach(() => setupTests());

function makeParser(): DeckParser {
  const workspace = new Workspace(true, 'fs');
  return new DeckParser({
    name: 'noop.html',
    settings: new CardOption({ cherry: 'false' }),
    files: [{ name: 'noop.html', contents: '<html></html>' }],
    noLimits: true,
    workspace,
  });
}

describe('DeckParser.locateTags substring guard', () => {
  test('extracts <del> tags from the back when present', () => {
    const parser = makeParser();
    const note = new Note('What is X?', 'It is Y. <del>biology,unit-3</del>');

    parser.locateTags(note, []);

    expect(note.tags).toEqual(expect.arrayContaining(['biology', 'unit-3']));
    expect(note.back).not.toContain('<del>');
  });

  test('extracts <del> tags from the front when present', () => {
    const parser = makeParser();
    const note = new Note('What is X? <del>chemistry</del>', 'It is Y.');

    parser.locateTags(note, []);

    expect(note.tags).toContain('chemistry');
    expect(note.name).not.toContain('<del>');
  });

  test('leaves note untouched when neither side contains <del>', () => {
    const parser = makeParser();
    const note = new Note('What is X?', 'It is Y.');

    parser.locateTags(note, []);

    expect(note.tags).toEqual([]);
    expect(note.name).toBe('What is X?');
    expect(note.back).toBe('It is Y.');
  });

  test('still appends deck-global tags even when no <del> is present', () => {
    const parser = makeParser();
    const note = new Note('What is X?', 'It is Y.');

    parser.locateTags(note, ['chapter-1', 'midterm']);

    expect(note.tags).toEqual(['chapter-1', 'midterm']);
  });
});
