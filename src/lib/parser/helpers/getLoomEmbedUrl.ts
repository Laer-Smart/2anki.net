/**
 * Loom share links (https://www.loom.com/share/<id>) refuse to render in an
 * iframe — the embeddable form lives at https://www.loom.com/embed/<id>.
 * Rewrites a share URL to its embed equivalent; any other Loom URL (already an
 * embed, or an unexpected shape) is returned unchanged.
 */
export default function getLoomEmbedUrl(url: string): string {
  return url.replace('/share/', '/embed/');
}
