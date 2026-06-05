import { strToU8, zipSync } from 'fflate';

import {
  EpubNoAnnotationsError,
  EpubTooLargeError,
  walkEpub,
} from './EpubWalker';

interface EpubFixture {
  title?: string;
  author?: string;
  containerXml?: string;
  opfPath?: string;
  xhtml: Record<string, string>;
  extraFiles?: Record<string, string>;
}

function buildEpub(fixture: EpubFixture): Uint8Array {
  const opfPath = fixture.opfPath ?? 'OEBPS/content.opf';
  const containerXml =
    fixture.containerXml ??
    `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="${opfPath}" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>`;

  const opfXml = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${fixture.title ?? 'Untitled'}</dc:title>
    <dc:creator>${fixture.author ?? 'Unknown'}</dc:creator>
  </metadata>
</package>`;

  const files: Record<string, Uint8Array> = {
    'META-INF/container.xml': strToU8(containerXml),
    [opfPath]: strToU8(opfXml),
  };

  for (const [name, contents] of Object.entries(fixture.xhtml)) {
    files[name] = strToU8(contents);
  }
  for (const [name, contents] of Object.entries(fixture.extraFiles ?? {})) {
    files[name] = strToU8(contents);
  }

  return zipSync(files);
}

const ANNOTATED_XHTML = `<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<body>
  <p>The book opens with a sentence.</p>
  <p>Later, a key passage: <span epub:type="annotation">cogito ergo sum</span> is highlighted.</p>
  <aside epub:type="annotation">a second highlighted aside</aside>
</body>
</html>`;

const PLAIN_XHTML = `<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<body>
  <p>Just a paragraph, no annotations.</p>
</body>
</html>`;

describe('walkEpub', () => {
  it('extracts annotation spans and asides with OPF metadata', () => {
    const epub = buildEpub({
      title: 'Discourse on the Method',
      author: 'René Descartes',
      xhtml: { 'OEBPS/Text/chapter1.xhtml': ANNOTATED_XHTML },
    });

    const result = walkEpub(epub);

    expect(result.source).toBe('epub');
    expect(result.highlights).toHaveLength(2);
    expect(result.highlights[0]).toEqual({
      book: 'Discourse on the Method',
      author: 'René Descartes',
      highlight: 'cogito ergo sum',
    });
    expect(result.highlights[1].highlight).toBe('a second highlighted aside');
  });

  it('throws EpubNoAnnotationsError when no annotation tags are present', () => {
    const epub = buildEpub({
      xhtml: { 'OEBPS/Text/chapter1.xhtml': PLAIN_XHTML },
    });
    expect(() => walkEpub(epub)).toThrow(EpubNoAnnotationsError);
  });

  it('throws EpubTooLargeError when buffer exceeds the cap', () => {
    const epub = buildEpub({
      xhtml: { 'OEBPS/Text/chapter1.xhtml': ANNOTATED_XHTML },
    });
    expect(() => walkEpub(epub, { maxBytes: 100 })).toThrow(EpubTooLargeError);
  });

  it('strips HTML entities and inner markup from annotation text', () => {
    const xhtml = `<?xml version="1.0"?>
<html xmlns:epub="http://www.idpf.org/2007/ops"><body>
  <span epub:type="annotation">Tom &amp; Jerry &lt;b&gt;ran&lt;/b&gt; fast</span>
</body></html>`;
    const epub = buildEpub({
      xhtml: { 'OEBPS/Text/chapter1.xhtml': xhtml },
    });
    const result = walkEpub(epub);
    expect(result.highlights[0].highlight).toBe('Tom & Jerry <b>ran</b> fast');
  });

  it('walks multiple XHTML files', () => {
    const epub = buildEpub({
      xhtml: {
        'OEBPS/Text/chapter1.xhtml': ANNOTATED_XHTML,
        'OEBPS/Text/chapter2.xhtml': `<html xmlns:epub="http://www.idpf.org/2007/ops">
<body><span epub:type="annotation">chapter two highlight</span></body></html>`,
      },
    });
    const result = walkEpub(epub);
    expect(result.highlights).toHaveLength(3);
    expect(
      result.highlights.some((h) => h.highlight === 'chapter two highlight')
    ).toBe(true);
  });

  it('falls back to *.opf discovery when container.xml is missing', () => {
    const epub = buildEpub({
      title: 'Sans Container',
      author: 'Test',
      containerXml: '',
      xhtml: { 'OEBPS/Text/chapter1.xhtml': ANNOTATED_XHTML },
    });
    const result = walkEpub(epub);
    expect(result.highlights[0].book).toBe('Sans Container');
  });

  it('returns empty book/author when no OPF metadata exists', () => {
    // Build a zip directly with no .opf file.
    const epub = zipSync({
      'OEBPS/Text/chapter1.xhtml': strToU8(ANNOTATED_XHTML),
    });
    const result = walkEpub(epub);
    expect(result.highlights[0].book).toBe('');
    expect(result.highlights[0].author).toBe('');
  });

  it('skips zip entries whose names attempt path traversal', () => {
    const epub = zipSync({
      'META-INF/container.xml': strToU8(
        `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>`
      ),
      'OEBPS/content.opf': strToU8(
        `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Trusted Book</dc:title>
    <dc:creator>Test</dc:creator>
  </metadata>
</package>`
      ),
      'OEBPS/Text/safe.xhtml': strToU8(ANNOTATED_XHTML),
      '../../../etc/passwd.xhtml': strToU8(
        '<span epub:type="annotation">evil</span>'
      ),
    });
    const result = walkEpub(epub);
    expect(result.highlights.some((h) => h.highlight === 'evil')).toBe(false);
  });
});
