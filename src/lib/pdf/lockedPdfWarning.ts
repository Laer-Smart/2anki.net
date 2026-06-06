function baseName(filename: string): string {
  const normalized = filename.replaceAll('\\', '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
}

export function buildLockedPdfWarning(
  lockedFilenames: string[]
): string | null {
  const names = lockedFilenames.map(baseName).filter((n) => n.length > 0);
  if (names.length === 0) return null;

  if (names.length === 1) {
    return `${names[0]} is password-protected and was skipped. Unlock it in Preview or Adobe Reader, save a copy, and upload that on its own.`;
  }

  const joined = names.join(', ');
  return `${names.length} password-protected PDFs were skipped: ${joined}. Unlock each in Preview or Adobe Reader, save a copy, and upload them on their own.`;
}
