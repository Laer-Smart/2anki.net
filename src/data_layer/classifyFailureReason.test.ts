import { classifyFailureReason } from './classifyFailureReason';

describe('classifyFailureReason', () => {
  it.each([
    ['monthly_limit', 'paywall'],
    ['anonymous_cap', 'paywall'],
    ['{"code":"monthly_limit","cards_used":120,"limit":100}', 'paywall'],
    ['empty_deck', 'empty'],
    ['no_decks_created', 'empty'],
    ['No cards in this deck yet. Wrap your terms in toggles.', 'empty'],
    ['python_crash', 'technical'],
    ['pdf_password', 'technical'],
    ['upload_incomplete', 'technical'],
    ['some unmapped error string from the engine', 'technical'],
  ])('classifies %s as %s', (reason, bucket) => {
    expect(classifyFailureReason(reason)).toBe(bucket);
  });

  it('treats a null reason as technical', () => {
    expect(classifyFailureReason(null)).toBe('technical');
  });

  it('treats an undefined reason as technical', () => {
    expect(classifyFailureReason(undefined)).toBe('technical');
  });
});
