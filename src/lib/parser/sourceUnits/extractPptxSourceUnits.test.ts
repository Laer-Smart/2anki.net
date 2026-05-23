import { strToU8, zipSync } from 'fflate';
import { extractPptxSourceUnits } from './extractPptxSourceUnits';

function buildPptx(
  slides: Array<{ xml: string; notesXml?: string }>
): Buffer {
  const files: Record<string, Uint8Array> = {};

  slides.forEach((slide, i) => {
    const n = i + 1;
    files[`ppt/slides/slide${n}.xml`] = strToU8(slide.xml);
    if (slide.notesXml) {
      files[`ppt/notesSlides/notesSlide${n}.xml`] = strToU8(slide.notesXml);
    }
  });

  return Buffer.from(zipSync(files));
}

const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main';

function slideXml(title: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="${NS_A}" xmlns:p="${NS_P}">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody>
          <a:p><a:r><a:t>${title}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr>
        <p:txBody>
          <a:p><a:r><a:t>${body}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
}

function notesXml(text: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="${NS_A}" xmlns:p="${NS_P}">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
        <p:txBody>
          <a:p><a:r><a:t>${text}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`;
}

function imageSlidXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="${NS_A}" xmlns:p="${NS_P}">
  <p:cSld>
    <p:spTree>
      <p:pic><p:nvPicPr><p:cNvPr name="image"/></p:nvPicPr></p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`;
}

describe('extractPptxSourceUnits', () => {
  it('returns one unit per slide with title and body text', async () => {
    const pptx = buildPptx([
      { xml: slideXml('Slide One', 'Body text here') },
    ]);

    const units = await extractPptxSourceUnits(pptx);

    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({
      id: 'slide-1',
      role: 'title',
      visibleText: 'Slide One\nBody text here',
      speakerNotes: '',
    });
  });

  it('assigns stable sequential IDs slide-1, slide-2, slide-3', async () => {
    const pptx = buildPptx([
      { xml: slideXml('A', 'a') },
      { xml: slideXml('B', 'b') },
      { xml: slideXml('C', 'c') },
    ]);

    const units = await extractPptxSourceUnits(pptx);

    expect(units.map((u) => u.id)).toEqual(['slide-1', 'slide-2', 'slide-3']);
  });

  it('attaches speaker notes to the corresponding slide unit', async () => {
    const pptx = buildPptx([
      {
        xml: slideXml('Mitosis', 'Cell division'),
        notesXml: notesXml('Remember: prophase, metaphase, anaphase, telophase'),
      },
    ]);

    const units = await extractPptxSourceUnits(pptx);

    expect(units[0].speakerNotes).toBe(
      'Remember: prophase, metaphase, anaphase, telophase'
    );
  });

  it('returns empty array for a PPTX with no slides', async () => {
    const pptx = Buffer.from(zipSync({ 'ppt/presentation.xml': strToU8('<root/>') }));

    const units = await extractPptxSourceUnits(pptx);

    expect(units).toEqual([]);
  });

  it('assigns role image for slides with no text shapes', async () => {
    const pptx = buildPptx([{ xml: imageSlidXml() }]);

    const units = await extractPptxSourceUnits(pptx);

    expect(units[0]).toMatchObject({
      id: 'slide-1',
      role: 'image',
      visibleText: '',
      speakerNotes: '',
    });
  });

  it('handles multiple text runs within a paragraph', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="${NS_A}" xmlns:p="${NS_P}">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody>
          <a:p><a:r><a:t>Hello </a:t></a:r><a:r><a:t>World</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
    const pptx = buildPptx([{ xml }]);

    const units = await extractPptxSourceUnits(pptx);

    expect(units[0].visibleText).toBe('Hello World');
  });
});
