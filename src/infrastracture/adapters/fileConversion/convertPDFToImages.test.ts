import path from 'path';
import { convertPDFToImages } from './convertPDFToImages';
import CardOption from '../../../lib/parser/Settings/CardOption';

jest.mock('fs/promises', () => ({
  __esModule: true,
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../lib/pdf/getPageCount', () => ({
  getPageCount: jest.fn().mockResolvedValue(2),
}));

jest.mock('../../../lib/pdf/convertPage', () => ({
  convertPage: jest
    .fn()
    .mockImplementation((pdfPath: string, pageNumber: number) =>
      Promise.resolve(`${pdfPath}-page${pageNumber}-${pageNumber}.png`)
    ),
}));

const { writeFile, mkdir } = require('fs/promises');
const { getPageCount } = require('../../../lib/pdf/getPageCount');
const { convertPage } = require('../../../lib/pdf/convertPage');

function makeSettings(overrides: Record<string, string> = {}): CardOption {
  return new CardOption({ ...CardOption.LoadDefaultOptions(), ...overrides });
}

const WORKSPACE_LOCATION = '/tmp/race-workspace';

function makeWorkspace(location = WORKSPACE_LOCATION) {
  return { location } as never;
}

describe('convertPDFToImages — concurrent-run isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gives two concurrent calls with the same name distinct pdf write paths', async () => {
    const workspace = makeWorkspace();

    await Promise.all([
      convertPDFToImages({
        name: 'anatomy.pdf',
        workspace,
        noLimits: true,
        contents: Buffer.from('%PDF-1.4 a'),
        settings: makeSettings(),
      }),
      convertPDFToImages({
        name: 'anatomy.pdf',
        workspace,
        noLimits: true,
        contents: Buffer.from('%PDF-1.4 b'),
        settings: makeSettings(),
      }),
    ]);

    const writePaths = (writeFile as jest.Mock).mock.calls.map(
      (call) => call[0] as string
    );
    expect(writePaths).toHaveLength(2);
    expect(writePaths[0]).not.toEqual(writePaths[1]);

    const pageCountPaths = (getPageCount as jest.Mock).mock.calls.map(
      (call) => call[0] as string
    );
    expect(pageCountPaths).toHaveLength(2);
    expect(pageCountPaths[0]).not.toEqual(pageCountPaths[1]);

    for (const writtenPath of writePaths) {
      expect(path.dirname(writtenPath)).not.toEqual(WORKSPACE_LOCATION);
      expect(path.dirname(writtenPath).startsWith(WORKSPACE_LOCATION)).toBe(
        true
      );
    }
  });

  it('creates a unique subdirectory inside the workspace for each call', async () => {
    const workspace = makeWorkspace();

    await convertPDFToImages({
      name: 'notes.pdf',
      workspace,
      noLimits: true,
      contents: Buffer.from('%PDF-1.4'),
      settings: makeSettings(),
    });

    const mkdirCalls = (mkdir as jest.Mock).mock.calls;
    expect(mkdirCalls).toHaveLength(1);
    const createdDir = mkdirCalls[0][0] as string;
    expect(path.dirname(createdDir)).toEqual(WORKSPACE_LOCATION);
    expect(path.basename(createdDir).startsWith('pdf-')).toBe(true);
  });

  it('emits img src paths resolvable from the workspace location', async () => {
    const workspace = makeWorkspace();

    const html = await convertPDFToImages({
      name: 'notes.pdf',
      workspace,
      noLimits: true,
      contents: Buffer.from('%PDF-1.4'),
      settings: makeSettings(),
    });

    const srcMatches = [...html.matchAll(/<img src="([^"]+)"/g)].map(
      (m) => m[1]
    );
    expect(srcMatches.length).toBeGreaterThan(0);
    const pageImagePath = (convertPage as jest.Mock).mock.results[0]
      .value as Promise<string>;
    const resolvedPageImage = await pageImagePath;
    for (const src of srcMatches) {
      expect(src.includes('..')).toBe(false);
      const resolved = path.resolve(WORKSPACE_LOCATION, src);
      expect(resolved.startsWith(WORKSPACE_LOCATION)).toBe(true);
    }
    expect(path.resolve(WORKSPACE_LOCATION, srcMatches[0])).toEqual(
      resolvedPageImage
    );
  });
});
