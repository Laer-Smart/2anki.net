import * as cheerio from 'cheerio';

import replaceAll from './replaceAll';

function mergeAdjacentCodeSiblingsInString(input: string): string {
  const adjacentCodePattern = /<\/code><code>/g;
  return input.replace(adjacentCodePattern, '');
}

function findHighestClozeNumber(input: string): number {
  const clozeRegex = /c(\d+)::/g;
  const numbers = Array.from(input.matchAll(clozeRegex)).map((match) =>
    parseInt(match[1])
  );
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

function handleKatexCloze(
  content: string,
  num: number,
  isStandalone: boolean
): string {
  const vReplaced = content.replace('KaTex:', '');
  return isStandalone
    ? `{{c${num}::${vReplaced} }}`
    : `{{c${num}::${vReplaced}}}`;
}

function handleRegularCloze(content: string, num: number): string {
  return content.match(/c\d::/) ? `{{${content}}}` : `{{c${num}::${content}}}`;
}

function handleExplicitCloze(content: string): string {
  const prefix = content.includes('{{') ? '' : '{{';
  const suffix = content.endsWith('}}') ? '' : '}}';
  return `${prefix}${content}${suffix}`;
}

export default function handleClozeDeletions(
  input: string,
  groupClozePerToggle = false
) {
  const merged = mergeAdjacentCodeSiblingsInString(input);
  let num = findHighestClozeNumber(merged);
  const next = () => (groupClozePerToggle ? num : num++);
  const dom = cheerio.load(merged);
  const clozeDeletions = dom('code');
  let mangle = merged;
  const totalCodeBlocks = (merged.match(/<code>/g) || []).length;

  clozeDeletions.each((_i, elem) => {
    const v = dom(elem).html();
    if (!v) return;

    const old = dom.html(elem);

    if (v.includes('KaTex')) {
      const isStandalone = totalCodeBlocks === 1;
      mangle = replaceAll(
        mangle,
        old,
        handleKatexCloze(v, next(), isStandalone)
      );
      return;
    }

    if (v.includes('{{c') && v.includes('}}')) {
      mangle = replaceAll(mangle, old, v);
      return;
    }

    if (v.match(/c\d::/)) {
      mangle = replaceAll(mangle, old, handleExplicitCloze(v));
      return;
    }

    mangle = replaceAll(mangle, old, handleRegularCloze(v, next()));
  });

  return mangle;
}
