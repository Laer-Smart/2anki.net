const DELETE_CODE = 127;
const TAB_CODE = 9;
const NEWLINE_CODE = 10;

function isControlCode(code: number, keepNewlinesAndTabs: boolean): boolean {
  if (code === DELETE_CODE) return true;
  if (code >= 32) return false;
  if (keepNewlinesAndTabs && (code === TAB_CODE || code === NEWLINE_CODE)) {
    return false;
  }
  return true;
}

function stripControlChars(text: string, keepNewlinesAndTabs: boolean): string {
  let out = '';
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (isControlCode(code, keepNewlinesAndTabs)) {
      out += keepNewlinesAndTabs ? '' : ' ';
    } else {
      out += char;
    }
  }
  return out;
}

export function sanitizeInlineErrorText(text: string): string {
  return stripControlChars(text, false)
    .replaceAll('`', "'")
    .replaceAll(/\s+/g, ' ')
    .trim();
}

export function sanitizeBlockErrorText(text: string): string {
  return stripControlChars(text, true).replaceAll('`', "'");
}
