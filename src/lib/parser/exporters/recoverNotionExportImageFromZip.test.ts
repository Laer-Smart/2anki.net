import { recoverNotionExportImageFromZip } from './recoverNotionExportImageFromZip';
import { File } from '../../zip/zip';

const png = Buffer.from('fake-png-bytes');

describe('recoverNotionExportImageFromZip', () => {
  const files: File[] = [
    { name: 'Export-abc/Obstetrics 1/image 1.png', contents: png },
    { name: 'Export-abc/notes.html', contents: '<html></html>' },
  ];

  it('recovers a Notion-export image when the host is glued to the relative path', () => {
    const result = recoverNotionExportImageFromZip(
      'https://app.notion.comObstetrics%201/image%201.png',
      files
    );
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Export-abc/Obstetrics 1/image 1.png');
  });

  it('matches on the basename when the parent folder is absent from the entry path', () => {
    const flatFiles: File[] = [{ name: 'image 1.png', contents: png }];
    const result = recoverNotionExportImageFromZip(
      'https://app.notion.comObstetrics%201/image%201.png',
      flatFiles
    );
    expect(result?.name).toBe('image 1.png');
  });

  it('handles the notion.so and notion.site hosts', () => {
    expect(
      recoverNotionExportImageFromZip(
        'https://www.notion.soObstetrics%201/image%201.png',
        files
      )?.name
    ).toBe('Export-abc/Obstetrics 1/image 1.png');
    expect(
      recoverNotionExportImageFromZip(
        'https://notion.siteObstetrics%201/image%201.png',
        files
      )?.name
    ).toBe('Export-abc/Obstetrics 1/image 1.png');
  });

  it('returns null for a well-formed URL with a slash-separated path', () => {
    expect(
      recoverNotionExportImageFromZip(
        'https://app.notion.com/Obstetrics%201/image%201.png',
        files
      )
    ).toBeNull();
  });

  it('returns null for a non-Notion URL', () => {
    expect(
      recoverNotionExportImageFromZip(
        'https://example.comObstetrics%201/image%201.png',
        files
      )
    ).toBeNull();
  });

  it('returns null when the referenced file is absent from the export', () => {
    expect(
      recoverNotionExportImageFromZip(
        'https://app.notion.comObstetrics%201/missing.png',
        files
      )
    ).toBeNull();
  });
});
