import JSZip from 'jszip';

import { setupTests } from '../../../test/configure-jest';
import CardOption from '../../../lib/parser/Settings/CardOption';
import { DeckParser } from '../../../lib/parser/DeckParser';
import Note from '../../../lib/parser/Note';
import Workspace from '../../../lib/parser/WorkSpace';
import { convertDocxToHTML } from './convertDocxToHTML';

async function buildDocx(bodyXml: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.folder('word')?.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${bodyXml}</w:body>
</w:document>`
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}

const strikethroughRun =
  '<w:r><w:rPr><w:strike/></w:rPr><w:t>biology, anatomy</w:t></w:r>';

describe('convertDocxToHTML strikethrough', () => {
  it('emits <del> for native Word strikethrough runs so the tag pipeline can read them', async () => {
    const docx = await buildDocx(
      `<w:p><w:r><w:t xml:space="preserve">Mitochondria </w:t></w:r>${strikethroughRun}</w:p>`
    );

    const html = await convertDocxToHTML(docx);

    expect(html).toContain('<del>biology, anatomy</del>');
    expect(html).not.toContain('<s>biology');
  });

  it('leaves plain text untouched when no strikethrough is present', async () => {
    const docx = await buildDocx(
      '<w:p><w:r><w:t>Plain front and back</w:t></w:r></w:p>'
    );

    const html = await convertDocxToHTML(docx);

    expect(html).toContain('Plain front and back');
    expect(html).not.toContain('<del>');
  });
});

function makeParser(): DeckParser {
  return new DeckParser({
    name: 'word.html',
    settings: new CardOption({ cherry: 'false' }),
    files: [{ name: 'word.html', contents: '<html></html>' }],
    noLimits: true,
    workspace: new Workspace(true, 'fs'),
  });
}

describe('docx strikethrough feeds the existing tag pipeline', () => {
  beforeEach(() => setupTests());

  it('turns a strikethrough word on a card back into a tag and strips it from the card', async () => {
    const docx = await buildDocx(
      `<w:p><w:r><w:t xml:space="preserve">Cell answer </w:t></w:r>${strikethroughRun}</w:p>`
    );

    const html = await convertDocxToHTML(docx);
    const back = html.slice(html.indexOf('<p>') + 3, html.indexOf('</p>'));
    const note = new Note('What organelle makes ATP?', back);

    makeParser().locateTags(note, []);

    expect(note.tags).toEqual(expect.arrayContaining(['biology', 'anatomy']));
    expect(note.back).not.toContain('<del>');
    expect(note.back).not.toContain('biology, anatomy');
  });

  it('does not tag a card when useTags is disabled', () => {
    const parser = new DeckParser({
      name: 'word.html',
      settings: new CardOption({ cherry: 'false', tags: 'false' }),
      files: [{ name: 'word.html', contents: '<html></html>' }],
      noLimits: true,
      workspace: new Workspace(true, 'fs'),
    });

    expect(parser.settings.useTags).toBe(false);
  });
});
