import path from 'path';

/**
 * Validates that a zip-entry name does not escape the destination directory
 * when joined with it. Rejects absolute paths, path-traversal segments
 * (`..`), and any entry whose resolved path falls outside `baseDir`.
 *
 * Returns the resolved absolute path on success. Throws on any unsafe input.
 *
 * Guards against CWE-22 (Path Traversal) and Sonar javascript:S5042 (Zip Slip).
 */
export function resolveSafeEntryPath(
  entryName: string,
  baseDir: string
): string {
  if (typeof entryName !== 'string' || entryName.length === 0) {
    throw new Error('Zip entry name is empty');
  }
  if (path.isAbsolute(entryName)) {
    throw new Error(`Zip entry name is an absolute path: ${entryName}`);
  }

  // Normalise the base so the resolved comparison is reliable across
  // symlinks, trailing slashes, and `.`/`..` segments in the base itself.
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, entryName);

  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error(
      `Zip entry resolves outside the destination directory: ${entryName}`
    );
  }

  return resolved;
}

/**
 * Boolean variant of `resolveSafeEntryPath` for use in `Array.filter`
 * pipelines, where throwing would stop the whole extraction. Pair with
 * explicit logging at the call site so silently-skipped entries are visible.
 */
export function isSafeEntryName(entryName: string, baseDir: string): boolean {
  try {
    resolveSafeEntryPath(entryName, baseDir);
    return true;
  } catch {
    return false;
  }
}
