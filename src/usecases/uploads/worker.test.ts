import fs from 'fs';
import { getFileContents } from './worker';
import { UploadedFile } from '../../lib/storage/types';

jest.mock('fs');

const mockFs = jest.mocked(fs);

function makeFile(overrides: Partial<UploadedFile>): UploadedFile {
  return {
    fieldname: 'file',
    originalname: 'test.html',
    encoding: '7bit',
    mimetype: 'text/html',
    size: 0,
    stream: null as never,
    destination: '',
    filename: 'test.html',
    path: '',
    buffer: undefined as never,
    key: 'test-key',
    ...overrides,
  };
}

describe('getFileContents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when path is set to a missing file and buffer is undefined', () => {
    const file = makeFile({ path: '/tmp/upload-gone', buffer: undefined as never });
    mockFs.existsSync = jest.fn().mockReturnValue(false);

    expect(() => getFileContents(file)).toThrow(
      'Uploaded file is no longer available on disk and has no buffer fallback'
    );
  });

  it('throws when neither path nor buffer is present', () => {
    const file = makeFile({ path: '', buffer: undefined as never });

    expect(() => getFileContents(file)).toThrow(
      'Uploaded file has neither a path nor a buffer'
    );
  });

  it('returns buffer contents when path is absent and buffer is present', () => {
    const content = Buffer.from('hello');
    const file = makeFile({ path: '', buffer: content });

    const result = getFileContents(file);

    expect(result).toEqual(content);
  });

  it('returns file contents when path exists on disk', () => {
    const content = Buffer.from('disk content');
    const file = makeFile({ path: '/tmp/upload-exists' });
    mockFs.existsSync = jest.fn().mockReturnValue(true);
    mockFs.readFileSync = jest.fn().mockReturnValue(content);

    const result = getFileContents(file);

    expect(result).toEqual(content);
  });
});
