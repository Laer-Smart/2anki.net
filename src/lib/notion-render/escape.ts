const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (input: string): string =>
  input.replace(/[&<>"']/g, (ch) => ENTITIES[ch] ?? ch);

export const escapeAttribute = (input: string): string => escapeHtml(input);
