import { AnkiNoteType } from '../../lib/backend/templates';

type PreviewData = Record<string, string>;

const CONDITIONAL_RE = /\{\{([#^])([^}]+?)\}\}([\s\S]*?)\{\{\/\2\}\}/g;
const CLOZE_FIELD_RE = /\{\{cloze:([^}]+?)\}\}/g;
const CLOZE_TOKEN_RE = /\{\{c\d+::([^}:]+)(?:::[^}]+)?\}\}/g;
const FIELD_RE = /\{\{(?![#^/])([^}]+?)\}\}/g;

function renderClozeContent(value: string, side: 'front' | 'back'): string {
  return value.replace(CLOZE_TOKEN_RE, (_match, answer) => {
    if (side === 'front') return '<span class="cloze">[&hellip;]</span>';
    return `<span class="cloze">${answer}</span>`;
  });
}

function resolveConditionals(format: string, data: PreviewData): string {
  let previous = '';
  let next = format;
  while (next !== previous) {
    previous = next;
    next = next.replace(
      CONDITIONAL_RE,
      (_match, kind: string, fieldName: string, content: string) => {
        const value = data[fieldName.trim()] ?? '';
        const isPresent = value.length > 0;
        const shouldShow = kind === '#' ? isPresent : !isPresent;
        return shouldShow ? content : '';
      }
    );
  }
  return next;
}

function substituteFields(
  format: string,
  data: PreviewData,
  side: 'front' | 'back'
): string {
  const withoutConditionals = resolveConditionals(format, data);
  const withCloze = withoutConditionals.replace(
    CLOZE_FIELD_RE,
    (_match, fieldName: string) =>
      renderClozeContent(data[fieldName.trim()] ?? '', side)
  );
  return withCloze.replace(
    FIELD_RE,
    (_match, fieldName: string) => data[fieldName.trim()] ?? ''
  );
}

export function renderCardSide(
  noteType: AnkiNoteType,
  previewData: PreviewData,
  side: 'front' | 'back'
): string {
  const template = noteType.tmpls[0];
  if (!template) return '';
  if (side === 'front') {
    return substituteFields(template.qfmt, previewData, 'front');
  }
  const frontHtml = substituteFields(template.qfmt, previewData, 'front');
  const backWithFront = template.afmt.replaceAll('{{FrontSide}}', frontHtml);
  return substituteFields(backWithFront, previewData, 'back');
}

export function buildPreviewDocument(
  noteType: AnkiNoteType,
  previewData: PreviewData,
  side: 'front' | 'back'
): string {
  const body = renderCardSide(noteType, previewData, side);
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #fff; color: #111; }
body { overflow: hidden; display: flex; }
body > .card { flex: 1; min-height: 100%; box-sizing: border-box; }
${noteType.css ?? ''}
html, body { margin: 0 !important; padding: 0 !important; max-width: none !important; width: 100% !important; height: 100% !important; }
body { display: flex !important; }
</style></head><body><div class="card">${body}</div></body></html>`;
}
