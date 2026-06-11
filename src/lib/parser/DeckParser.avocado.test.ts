import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Note from './Note';
import Workspace from './WorkSpace';

beforeEach(() => setupTests());

const makeParser = () => {
  const html = `<html><head><title>x</title></head><body><article class="page"><div class="page-body"></div></article></body></html>`;
  return new DeckParser({
    name: 'x.html',
    settings: new CardOption({}),
    files: [{ name: 'x.html', contents: html }],
    noLimits: true,
    workspace: new Workspace(true, 'fs'),
  });
};

describe('noteHasAvocado', () => {
  it('detects the avocado emoji in the back like cherry does', () => {
    const parser = makeParser();
    const note = new Note('plain front', 'answer 🥑');
    expect(parser.noteHasAvocado(note)).toBe(true);
  });

  it('detects the avocado HTML entity in the back', () => {
    const parser = makeParser();
    const note = new Note('plain front', 'answer &#x1F951;');
    expect(parser.noteHasAvocado(note)).toBe(true);
  });

  it('detects the avocado in the front', () => {
    const parser = makeParser();
    const note = new Note('front 🥑', 'plain back');
    expect(parser.noteHasAvocado(note)).toBe(true);
  });

  it('returns false when neither side has the avocado', () => {
    const parser = makeParser();
    const note = new Note('plain front', 'plain back');
    expect(parser.noteHasAvocado(note)).toBe(false);
  });
});
