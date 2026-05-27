export function keepManifestSameOrigin(html: string): string {
  return html.replace(
    /(<link\s+rel="manifest"\s+href=")[^"]*site\.webmanifest(")/,
    '$1/site.webmanifest$2'
  );
}
