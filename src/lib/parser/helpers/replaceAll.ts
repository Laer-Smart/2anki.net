export default function replaceAll(
  original: string,
  oldValue: string,
  newValue: string
): string {
  const escaped = oldValue.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&');
  const reg = new RegExp(escaped, 'g');
  return original.replace(reg, newValue);
}
