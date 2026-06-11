import path from 'path';

const isSafeZipEntryName = (entryName: string): boolean => {
  const normalized = entryName.replaceAll('\\', '/');

  if (path.posix.isAbsolute(normalized) || /^[A-Za-z]:\//.test(normalized)) {
    return false;
  }

  const resolved = path.posix.normalize(normalized);
  if (resolved.startsWith('..') || resolved.includes('/../')) {
    return false;
  }

  return true;
};

export { isSafeZipEntryName };
