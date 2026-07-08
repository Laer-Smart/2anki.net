import { detectOverSplit, OVER_SPLIT_MIN_CARDS } from './detectOverSplit';

function fronts(count: number, text: string): string[] {
  return Array.from({ length: count }, () => text);
}

describe('detectOverSplit', () => {
  it('flags a large deck of one-word fronts', () => {
    expect(detectOverSplit(fronts(250, 'arise.'))).toBe(true);
  });

  it('flags a large deck of two-word fronts wrapped in markup', () => {
    expect(detectOverSplit(fronts(300, '<p>the tribunal</p>'))).toBe(true);
  });

  it('does not flag a deck below the size threshold', () => {
    expect(detectOverSplit(fronts(OVER_SPLIT_MIN_CARDS - 1, 'arise.'))).toBe(
      false
    );
  });

  it('does not flag a large deck of real question fronts', () => {
    expect(detectOverSplit(fronts(400, 'What is the capital of France?'))).toBe(
      false
    );
  });

  it('does not flag a large deck with a modest share of short fronts', () => {
    const mixed = [
      ...fronts(120, 'arise.'),
      ...fronts(180, 'Why does the professor prefer negative interest rates?'),
    ];
    expect(detectOverSplit(mixed)).toBe(false);
  });

  it('returns false for an empty deck', () => {
    expect(detectOverSplit([])).toBe(false);
  });
});
