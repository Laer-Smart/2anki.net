const HIRAGANA_KATAKANA = /[぀-ヿ]/;
const HANGUL = /[가-힯ᄀ-ᇿ㄰-㆏]/;
const CJK_IDEOGRAPHS = /[一-鿿㐀-䶿]/;

const HTML_TAG = /<[^>]+>/g;

function stripHtml(text: string): string {
  return text.replace(HTML_TAG, ' ');
}

export function detectFrontLanguage(samples: readonly string[]): string {
  let japaneseHits = 0;
  let koreanHits = 0;
  let ideographHits = 0;
  let totalContentful = 0;

  for (const raw of samples) {
    const plain = stripHtml(raw).trim();
    if (plain.length === 0) continue;
    totalContentful += 1;
    if (HIRAGANA_KATAKANA.test(plain)) japaneseHits += 1;
    else if (HANGUL.test(plain)) koreanHits += 1;
    else if (CJK_IDEOGRAPHS.test(plain)) ideographHits += 1;
  }

  if (totalContentful === 0) return '';

  const threshold = Math.max(1, Math.ceil(totalContentful * 0.5));
  if (japaneseHits >= threshold) return 'ja';
  if (koreanHits >= threshold) return 'ko';
  if (ideographHits >= threshold) return 'zh';
  return 'en';
}
