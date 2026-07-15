import { isImageOnlyUpload } from './isImageOnlyUpload';

describe('isImageOnlyUpload', () => {
  it('returns true when every uploaded file is an image', () => {
    expect(
      isImageOnlyUpload([
        { originalname: 'page-1.png' },
        { originalname: 'page-2.JPG' },
        { originalname: 'diagram.jpeg' },
      ])
    ).toBe(true);
  });

  it('returns true for a single image upload', () => {
    expect(isImageOnlyUpload([{ originalname: 'notes.png' }])).toBe(true);
  });

  it('returns false when any file is text-bearing', () => {
    expect(
      isImageOnlyUpload([
        { originalname: 'page-1.png' },
        { originalname: 'notes.html' },
      ])
    ).toBe(false);
  });

  it('returns false for a lone non-image file', () => {
    expect(isImageOnlyUpload([{ originalname: 'study-notes.zip' }])).toBe(
      false
    );
  });

  it('returns false when there are no files', () => {
    expect(isImageOnlyUpload([])).toBe(false);
    expect(isImageOnlyUpload(undefined)).toBe(false);
  });

  it('returns false when a filename is missing', () => {
    expect(isImageOnlyUpload([{ originalname: undefined }])).toBe(false);
  });

  it('rejects a filename that attempts path traversal', () => {
    expect(isImageOnlyUpload([{ originalname: '../secret.png' }])).toBe(false);
  });
});
