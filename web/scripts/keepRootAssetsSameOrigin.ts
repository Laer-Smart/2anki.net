const SAME_ORIGIN_REL = ['icon', 'apple-touch-icon', 'manifest'];

function filenameFromHref(href: string): string {
  const withoutQuery = href.split(/[?#]/)[0];
  const segments = withoutQuery.split('/');
  return segments[segments.length - 1];
}

export function keepRootAssetsSameOrigin(html: string): string {
  return html.replace(/<link\b[^>]*>/g, (linkTag) => {
    const relMatch = /\brel="([^"]*)"/.exec(linkTag);
    if (relMatch == null || !SAME_ORIGIN_REL.includes(relMatch[1])) {
      return linkTag;
    }
    return linkTag.replace(
      /(\bhref=")([^"]*)(")/,
      (_full, prefix, href, suffix) => `${prefix}/${filenameFromHref(href)}${suffix}`
    );
  });
}
