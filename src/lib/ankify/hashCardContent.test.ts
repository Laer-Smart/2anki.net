import { hashCardContent } from './hashCardContent';

describe('hashCardContent', () => {
  test('produces a stable hex digest for the same front and back', () => {
    const first = hashCardContent('What is the capital of France?', 'Paris');
    const second = hashCardContent('What is the capital of France?', 'Paris');
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  test('changes when the back content changes', () => {
    const before = hashCardContent('Question', 'Old answer');
    const after = hashCardContent('Question', 'New answer');
    expect(after).not.toBe(before);
  });

  test('changes when the front content changes', () => {
    const before = hashCardContent('Old question', 'Answer');
    const after = hashCardContent('New question', 'Answer');
    expect(after).not.toBe(before);
  });

  test('is order-sensitive between front and back', () => {
    const direct = hashCardContent('A', 'B');
    const swapped = hashCardContent('B', 'A');
    expect(direct).not.toBe(swapped);
  });

  test('distinguishes a boundary shift between front and back', () => {
    const split = hashCardContent('ab', 'c');
    const shifted = hashCardContent('a', 'bc');
    expect(split).not.toBe(shifted);
  });
});
