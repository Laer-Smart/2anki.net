import { unzipSync } from 'fflate';
import { SourceUnit, SourceUnitRole } from './SourceUnit';

const SLIDE_PATTERN = /^ppt\/slides\/slide(\d+)\.xml$/;
const NOTES_PATTERN = /^ppt\/notesSlides\/notesSlide(\d+)\.xml$/;

function extractTextFromXml(xml: string): string {
  const texts: string[] = [];
  const runPattern = /<a:t[^>]*>([^<]*)<\/a:t>/g;
  let match: RegExpExecArray | null;
  const paragraphPattern = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
  let paraMatch: RegExpExecArray | null;

  while ((paraMatch = paragraphPattern.exec(xml)) !== null) {
    const paraContent = paraMatch[1];
    const paraTexts: string[] = [];
    runPattern.lastIndex = 0;
    while ((match = runPattern.exec(paraContent)) !== null) {
      const text = match[1];
      if (text.trim()) {
        paraTexts.push(text);
      }
    }
    if (paraTexts.length > 0) {
      texts.push(paraTexts.join(''));
    }
  }

  return texts.join('\n');
}

function hasTextShapes(slideXml: string): boolean {
  return /<p:sp\b/.test(slideXml) && /<a:t\b/.test(slideXml);
}

function hasPicture(slideXml: string): boolean {
  return /<p:pic\b/.test(slideXml);
}

function inferRole(slideXml: string, visibleText: string): SourceUnitRole {
  if (visibleText.trim() === '') {
    return hasPicture(slideXml) ? 'image' : 'body';
  }
  if (/<p:ph\s[^>]*type="title"/.test(slideXml)) {
    return 'title';
  }
  return 'body';
}

function extractSlideText(slideXml: string): string {
  const shapePattern = /<p:sp\b[\s\S]*?<\/p:sp>/g;
  const shapeTexts: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = shapePattern.exec(slideXml)) !== null) {
    const text = extractTextFromXml(match[0]);
    if (text.trim()) {
      shapeTexts.push(text);
    }
  }

  return shapeTexts.join('\n');
}

function extractNotesText(notesXml: string): string {
  const bodyPhPattern = /<p:sp\b[\s\S]*?<p:ph\s[^>]*idx="1"[\s\S]*?<\/p:sp>/g;
  let match: RegExpExecArray | null;

  while ((match = bodyPhPattern.exec(notesXml)) !== null) {
    const text = extractTextFromXml(match[0]);
    if (text.trim()) {
      return text.trim();
    }
  }

  return '';
}

export async function extractPptxSourceUnits(
  pptxBuffer: Buffer
): Promise<SourceUnit[]> {
  const zip = unzipSync(new Uint8Array(pptxBuffer));

  const slideEntries: Map<number, string> = new Map();
  const notesEntries: Map<number, string> = new Map();

  for (const name of Object.keys(zip)) {
    const slideMatch = SLIDE_PATTERN.exec(name);
    if (slideMatch) {
      const num = parseInt(slideMatch[1], 10);
      slideEntries.set(num, new TextDecoder().decode(zip[name]));
    }
    const notesMatch = NOTES_PATTERN.exec(name);
    if (notesMatch) {
      const num = parseInt(notesMatch[1], 10);
      notesEntries.set(num, new TextDecoder().decode(zip[name]));
    }
  }

  const slideNumbers = [...slideEntries.keys()].sort((a, b) => a - b);

  return slideNumbers.map((num) => {
    const slideXml = slideEntries.get(num)!;
    const notesXml = notesEntries.get(num) ?? '';

    const visibleText = hasTextShapes(slideXml)
      ? extractSlideText(slideXml)
      : '';
    const speakerNotes = notesXml ? extractNotesText(notesXml) : '';
    const role = inferRole(slideXml, visibleText);

    return {
      id: `slide-${num}`,
      visibleText,
      speakerNotes,
      role,
    };
  });
}
