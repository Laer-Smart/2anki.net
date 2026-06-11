import CardOption from './CardOption';
import { CARD_OPTION_DEFAULTS } from './cardOptionDefaults';
import supportedOptions from '../../../controllers/CardOptionsController/supportedOptions';

describe('CARD_OPTION_DEFAULTS as single source of truth', () => {
  it('drives every boolean catalog default from the defaults map', () => {
    for (const option of supportedOptions()) {
      const canonical = CARD_OPTION_DEFAULTS[option.key];
      expect(canonical).toBeDefined();
      expect(option.value).toBe(canonical === 'true');
    }
  });

  it('returns the canonical map from LoadDefaultOptions', () => {
    expect(CardOption.LoadDefaultOptions()).toEqual(CARD_OPTION_DEFAULTS);
  });
});

describe('CardOption constructor absent-key fallbacks', () => {
  it('treats absent enable-input as off for raw uploads', () => {
    expect(new CardOption({}).useInput).toBe(false);
  });

  it('keeps tags on when absent (Notion-path upload default)', () => {
    expect(new CardOption({}).useTags).toBe(true);
  });

  it('keeps cloze on when absent', () => {
    expect(new CardOption({}).isCloze).toBe(true);
  });

  it('keeps embed-images on when absent', () => {
    expect(new CardOption({}).embedImages).toBe(true);
  });

  it('keeps process-pdfs on when absent', () => {
    expect(new CardOption({}).processPDFs).toBe(true);
  });
});
