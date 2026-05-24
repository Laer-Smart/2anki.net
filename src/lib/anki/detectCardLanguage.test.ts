import { detectFrontLanguage } from './detectCardLanguage';

describe('detectFrontLanguage', () => {
  it('returns empty string for empty input', () => {
    expect(detectFrontLanguage([])).toBe('');
  });

  it('returns empty string when every sample is blank or HTML-only', () => {
    expect(detectFrontLanguage(['', '   ', '<p></p>'])).toBe('');
  });

  it('returns ja when hiragana dominates', () => {
    expect(detectFrontLanguage(['こんにちは', 'ありがとう', 'すみません'])).toBe('ja');
  });

  it('returns ja when katakana dominates', () => {
    expect(detectFrontLanguage(['コーヒー', 'テレビ', 'ラジオ'])).toBe('ja');
  });

  it('returns ko when hangul dominates', () => {
    expect(detectFrontLanguage(['안녕하세요', '감사합니다', '죄송합니다'])).toBe('ko');
  });

  it('returns zh when only CJK ideographs are present (no kana, no hangul)', () => {
    expect(detectFrontLanguage(['你好', '谢谢', '对不起'])).toBe('zh');
  });

  it('returns en for ASCII vocab', () => {
    expect(detectFrontLanguage(['hello', 'thanks', 'sorry'])).toBe('en');
  });

  it('returns en for European text with diacritics', () => {
    expect(detectFrontLanguage(['hola', 'mañana', 'gracias'])).toBe('en');
  });

  it('strips HTML tags before classifying', () => {
    expect(detectFrontLanguage(['<p>こんにちは</p>', '<span>ありがとう</span>'])).toBe('ja');
  });

  it('falls back to en when fewer than half of samples match a single script', () => {
    expect(detectFrontLanguage(['hello', 'world', 'こんにちは'])).toBe('en');
  });

  it('prefers ja over zh when both kana and ideographs appear together', () => {
    expect(detectFrontLanguage(['日本語のテスト', '私の名前', '今日は'])).toBe('ja');
  });
});
