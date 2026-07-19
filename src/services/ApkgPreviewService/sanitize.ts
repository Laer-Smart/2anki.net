import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'a',
  'article',
  'b',
  'blockquote',
  'br',
  'code',
  'details',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  'ruby',
  'rt',
  'rp',
  'rb',
  's',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
  'svg',
  'g',
  'image',
  'rect',
  'ellipse',
  'polygon',
];

const ALLOWED_ATTRS: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['class', 'style', 'dir', 'lang'],
  a: ['href', 'target', 'rel'],
  details: ['open'],
  img: ['src', 'alt', 'width', 'height', 'loading'],
  audio: ['src', 'controls', 'preload'],
  video: ['src', 'controls', 'preload', 'poster', 'width', 'height'],
  source: ['src', 'type'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan', 'scope'],
  svg: ['class', 'viewBox', 'preserveAspectRatio', 'xmlns'],
  image: ['href', 'src', 'x', 'y', 'width', 'height', 'preserveAspectRatio'],
  rect: ['x', 'y', 'width', 'height', 'fill', 'stroke', 'stroke-width'],
  ellipse: ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width'],
  polygon: ['points', 'fill', 'stroke', 'stroke-width'],
};

export function sanitizeCardHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    disallowedTagsMode: 'discard',
    parser: { lowerCaseTags: true, lowerCaseAttributeNames: false },
  });
}

export function sanitizeCss(css: string): string {
  return css
    .replace(/@import[^;]*;/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/<\/?style[^>]*>/gi, '');
}
