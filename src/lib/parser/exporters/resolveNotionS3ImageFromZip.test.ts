import { resolveNotionS3ImageFromZip } from './resolveNotionS3ImageFromZip';
import { File } from '../../zip/zip';

const makeFile = (name: string, contents: string): File =>
  ({ name, contents }) as File;

describe('resolveNotionS3ImageFromZip', () => {
  const zipFiles: File[] = [
    makeFile('My Topic/screenshot_1.png', 'png-bytes-1'),
    makeFile('My Topic/diagram.jpg', 'jpg-bytes'),
    makeFile('Other/unrelated.pdf', 'pdf-bytes'),
  ];

  it('matches a Notion S3 URL by the encoded filename in the URL path', () => {
    const url =
      'https://prod-files-secure.s3.us-west-2.amazonaws.com/workspace-id/file-id/screenshot_1.png?X-Amz-Expires=3600&X-Amz-Signature=abc';
    const result = resolveNotionS3ImageFromZip(url, zipFiles);
    expect(result).toEqual(
      makeFile('My Topic/screenshot_1.png', 'png-bytes-1')
    );
  });

  it('returns null for a non-Notion URL', () => {
    const result = resolveNotionS3ImageFromZip(
      'https://example.com/image.png',
      zipFiles
    );
    expect(result).toBeNull();
  });

  it('returns null when no ZIP entry matches the filename', () => {
    const url =
      'https://prod-files-secure.s3.us-west-2.amazonaws.com/workspace-id/file-id/missing.png?X-Amz-Expires=3600';
    const result = resolveNotionS3ImageFromZip(url, zipFiles);
    expect(result).toBeNull();
  });

  it('returns null for a relative path (non-S3 URL)', () => {
    const result = resolveNotionS3ImageFromZip('images/photo.png', zipFiles);
    expect(result).toBeNull();
  });

  it('handles URL-encoded filenames', () => {
    const filesWithSpaces: File[] = [
      makeFile('My Topic/my image.png', 'png-bytes'),
    ];
    const url =
      'https://prod-files-secure.s3.us-west-2.amazonaws.com/workspace-id/file-id/my%20image.png?X-Amz-Expires=3600';
    const result = resolveNotionS3ImageFromZip(url, filesWithSpaces);
    expect(result).toEqual(makeFile('My Topic/my image.png', 'png-bytes'));
  });
});
