import Package from '../parser/Package';
import { getSafeFilename, truncateToBytes } from '../getSafeFilename';

const APKG_EXTENSION = '.apkg';
const MAX_BASENAME_BYTES = 200;
const MAX_TITLE_BYTES =
  MAX_BASENAME_BYTES - Buffer.byteLength(APKG_EXTENSION, 'utf8');

function isPackage(something: unknown): something is Package {
  return something instanceof Package;
}

function isString(something: unknown): something is string {
  return typeof something === 'string';
}

export default function getDeckFilename(something: Package | string): string {
  let name = 'Default';
  if (isPackage(something)) {
    name = something.name;
  } else if (isString(something)) {
    name = something;
  }
  const safe = getSafeFilename(name);
  const base = safe.endsWith(APKG_EXTENSION)
    ? safe.slice(0, safe.length - APKG_EXTENSION.length)
    : safe;
  const truncated = truncateToBytes(base, MAX_TITLE_BYTES);
  return `${truncated}${APKG_EXTENSION}`;
}
