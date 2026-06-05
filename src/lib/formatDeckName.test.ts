import { formatDeckName } from './formatDeckName';

describe('formatDeckName', () => {
  it('strips .apkg, trailing ID, leading dash, and replaces dashes with spaces', () => {
    expect(
      formatDeckName('-How-to-make-all-cloze-number-1-5827131637243234.apkg')
    ).toBe('How to make all cloze number 1');
  });

  it('strips leading non-alphanumeric Unicode before applying remaining rules', () => {
    expect(formatDeckName('📄😺-HTML-test-5191454476635145.apkg')).toBe(
      'HTML test'
    );
  });

  it('falls back to Untitled deck when only the extension remains', () => {
    expect(formatDeckName('.apkg')).toBe('Untitled deck');
  });

  it('preserves a name that has no trailing numeric ID suffix', () => {
    expect(formatDeckName('My Deck.apkg')).toBe('My Deck');
  });
});
