import { isValidTextAlign } from './textAlignOptions';

export function withTextAlign(style: string | null, textAlign?: string) {
  if (style && isValidTextAlign(textAlign)) {
    style += '\n' + `* { text-align:${textAlign} }`;
  }
  return style;
}
