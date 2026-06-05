import { setupTests } from '../../../test/configure-jest';
import { embedFile } from './embedFile';
import CustomExporter from './CustomExporter';
import Workspace from '../WorkSpace';

beforeEach(() => setupTests());

const makeExporter = (firstDeckName = 'deck') =>
  ({
    firstDeckName,
    workspace: '/tmp',
    media: [],
    addMedia: jest.fn().mockReturnValue('/tmp/mock.png'),
  }) as unknown as CustomExporter;

const makeWorkspace = () =>
  ({ location: '/nonexistent-workspace-xyzzy' }) as unknown as Workspace;

describe('embedFile — filename-only fallback', () => {
  it('returns the single matching file when there is no collision', () => {
    const exporter = makeExporter();
    const file = { name: 'chapter1/image.png', contents: 'img-data' };

    const result = embedFile({
      exporter,
      files: [file],
      filePath: 'chapter1/sub/image.png',
      workspace: makeWorkspace(),
    });

    expect(result).not.toBeNull();
    expect(exporter.addMedia).toHaveBeenCalledWith(
      expect.any(String),
      'img-data'
    );
  });

  it('picks the file whose directory shares the most path segments with the request', () => {
    const exporter = makeExporter();
    const chapter1 = { name: 'chapter1/image.png', contents: 'chapter1-data' };
    const chapter2 = { name: 'chapter2/image.png', contents: 'chapter2-data' };

    embedFile({
      exporter,
      files: [chapter1, chapter2],
      // Does not suffix-match either file, so filename-only fallback is used.
      // requestDir = 'chapter2/sub' → chapter2 scores 1 shared segment, chapter1 scores 0.
      filePath: 'chapter2/sub/image.png',
      workspace: makeWorkspace(),
    });

    expect(exporter.addMedia).toHaveBeenCalledWith(
      expect.any(String),
      chapter2.contents
    );
  });

  it('falls back to first match when all colliding files score equally', () => {
    const exporter = makeExporter();
    const fileA = { name: 'a/image.png', contents: 'file-a' };
    const fileB = { name: 'b/image.png', contents: 'file-b' };

    // filePath has no directory, so requestDir is '' and both score 0.
    embedFile({
      exporter,
      files: [fileA, fileB],
      filePath: 'image.png',
      workspace: makeWorkspace(),
    });

    expect(exporter.addMedia).toHaveBeenCalledWith(
      expect.any(String),
      fileA.contents
    );
  });

  it('returns null when no file matches', () => {
    const exporter = makeExporter();
    const result = embedFile({
      exporter,
      files: [{ name: 'other/thing.png', contents: 'data' }],
      filePath: 'missing.png',
      workspace: makeWorkspace(),
    });

    expect(result).toBeNull();
  });
});
