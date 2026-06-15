import { File } from '../../zip/zip';

/**
 * Notion's HTML/ZIP export occasionally emits an `<img src>` where a Notion
 * host is concatenated directly onto a relative subfolder path with no
 * separator slash, e.g. `https://app.notion.comObstetrics 1/image 1.png`.
 * That string is not a valid URL (the would-be host carries the relative
 * path), so it can neither be fetched nor parsed with `new URL()` — the
 * image would otherwise be silently dropped.
 *
 * When the referenced file is present in the uploaded export, recover the
 * relative path by stripping the bogus Notion host prefix, then match it
 * against a ZIP entry by full relative path or basename. Returns the matching
 * File so the caller can embed it as local media instead of dropping it.
 */
const NOTION_HOST_PREFIX =
  /^https?:\/\/(?:[a-z0-9-]+\.)?notion\.(?:com|so|site)(.+)$/i;

export function recoverNotionExportImageFromZip(
  src: string,
  files: File[]
): File | null {
  const match = NOTION_HOST_PREFIX.exec(src);
  if (!match) {
    return null;
  }

  const rawRelative = match[1];
  if (rawRelative.startsWith('/')) {
    // A leading slash means the URL was well-formed (host/path), not the
    // host-glued-to-path corruption this recovery targets.
    return null;
  }

  let relative: string;
  try {
    relative = decodeURIComponent(rawRelative);
  } catch {
    relative = rawRelative;
  }

  const normalizedRelative = relative.replaceAll('\\', '/');
  const basename = normalizedRelative.split('/').pop();
  if (!basename) {
    return null;
  }

  return (
    files.find((f) => {
      const normalizedName = f.name.replaceAll('\\', '/');
      return (
        normalizedName === normalizedRelative ||
        normalizedName.endsWith('/' + normalizedRelative) ||
        normalizedName === basename ||
        normalizedName.endsWith('/' + basename)
      );
    }) ?? null
  );
}
