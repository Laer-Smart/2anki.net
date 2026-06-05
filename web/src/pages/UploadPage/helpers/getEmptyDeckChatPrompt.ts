export function getEmptyDeckChatPrompt(
  driveMimeType: string | null,
  filename: string | null
): string {
  if (driveMimeType === 'application/pdf') {
    return 'My PDF converted but produced 0 cards. The PDF has [describe layout — bulleted, prose, tables]. What should I change?';
  }

  if (driveMimeType != null && driveMimeType.length > 0) {
    return 'My file converted but produced 0 cards. Why might that be?';
  }

  const ext =
    filename == null ? '' : (filename.split('.').pop()?.toLowerCase() ?? '');

  if (ext === 'pdf') {
    return 'My PDF converted but produced 0 cards. The PDF has [describe layout — bulleted, prose, tables]. What should I change?';
  }

  if (ext === 'zip') {
    return "My Notion export converted but produced 0 cards. There were no toggles in the page. What's the fastest way to turn my notes into toggle blocks?";
  }

  if (ext === 'html') {
    return 'My HTML file converted but produced 0 cards. It came from [Notion / browser / other]. What structure does 2anki look for?';
  }

  if (ext === 'md') {
    return 'My markdown file converted but produced 0 cards. The file is a flat outline — should I use a specific heading or list pattern?';
  }

  const label = ext === '' ? 'file' : ext;
  return `My ${label} converted but produced 0 cards. Why might that be?`;
}
