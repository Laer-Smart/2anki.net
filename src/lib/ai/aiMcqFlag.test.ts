import { isAiMcqEnabled } from './aiMcqFlag';

describe('isAiMcqEnabled', () => {
  const originalFlag = process.env.AI_MCQ_ENABLED;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.AI_MCQ_ENABLED;
    } else {
      process.env.AI_MCQ_ENABLED = originalFlag;
    }
  });

  it('returns false when the flag is unset and the user is paying', () => {
    delete process.env.AI_MCQ_ENABLED;
    expect(isAiMcqEnabled({ isPaying: true })).toBe(false);
  });

  it('returns false when the flag is on but the user is not paying', () => {
    process.env.AI_MCQ_ENABLED = 'true';
    expect(isAiMcqEnabled({ isPaying: false })).toBe(false);
  });

  it('returns true when the flag is on and the user is paying', () => {
    process.env.AI_MCQ_ENABLED = 'true';
    expect(isAiMcqEnabled({ isPaying: true })).toBe(true);
  });

  it('treats values other than the literal string "true" as off', () => {
    process.env.AI_MCQ_ENABLED = '1';
    expect(isAiMcqEnabled({ isPaying: true })).toBe(false);
  });
});
