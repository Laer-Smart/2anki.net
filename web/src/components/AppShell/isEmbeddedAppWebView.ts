export function isEmbeddedAppWebView(userAgent: string): boolean {
  return /2anki-iOS-App|WKWebView/i.test(userAgent);
}
