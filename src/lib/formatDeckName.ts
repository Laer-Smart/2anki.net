export function formatDeckName(filename: string): string {
  const withoutExtension = filename.replace(/\.apkg$/, '');
  const withoutTrailingId = withoutExtension.replace(/-\d{10,}$/, '');
  const withoutLeadingDash = withoutTrailingId.replace(/^-+/, '');
  const withSpaces = withoutLeadingDash.replaceAll('-', ' ');
  const collapsed = withSpaces.replace(/\s+/g, ' ').trim();
  const withoutLeadingNonAlpha = collapsed
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .trim();
  return withoutLeadingNonAlpha.length > 0
    ? withoutLeadingNonAlpha
    : 'Untitled deck';
}
