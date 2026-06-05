import { classifyBlock, BlockDecision, ClassifyRules } from './classifyBlock';

const DEFAULT_RULES = { flashcardTypes: ['toggle'] };
const HEADING_RULES = { flashcardTypes: ['toggle', 'heading_1'] };

interface FixtureEntry {
  type: string;
  hasToggleableHeading: boolean;
  expectedDecision: BlockDecision;
}

describe('classifyBlock — toggle-only-default fixture', () => {
  const fixture: FixtureEntry[] = require('../../../test/fixtures/preview-intent/toggle-only-default.json');

  it.each(fixture)(
    'type=$type hasToggleableHeading=$hasToggleableHeading → $expectedDecision',
    ({ type, hasToggleableHeading, expectedDecision }) => {
      expect(classifyBlock({ type, hasToggleableHeading }, DEFAULT_RULES)).toBe(
        expectedDecision
      );
    }
  );
});

describe('classifyBlock — headings-as-cards fixture', () => {
  const fixture: FixtureEntry[] = require('../../../test/fixtures/preview-intent/headings-as-cards.json');

  it.each(fixture)(
    'type=$type hasToggleableHeading=$hasToggleableHeading → $expectedDecision',
    ({ type, hasToggleableHeading, expectedDecision }) => {
      expect(classifyBlock({ type, hasToggleableHeading }, HEADING_RULES)).toBe(
        expectedDecision
      );
    }
  );
});

describe('classifyBlock — recursive-page fixture', () => {
  const fixture: FixtureEntry[] = require('../../../test/fixtures/preview-intent/recursive-page.json');

  it.each(fixture)(
    'type=$type hasToggleableHeading=$hasToggleableHeading → $expectedDecision',
    ({ type, hasToggleableHeading, expectedDecision }) => {
      expect(classifyBlock({ type, hasToggleableHeading }, DEFAULT_RULES)).toBe(
        expectedDecision
      );
    }
  );
});

describe('classifyBlock — parity with BlockHandler inline predicate', () => {
  function legacyDecision(
    type: string,
    hasToggleableHeading: boolean,
    rules: ClassifyRules
  ): BlockDecision {
    const { flashcardTypes } = rules;
    if (type === 'child_page') return 'recurse';
    if (flashcardTypes.includes(type)) return 'card';
    if (hasToggleableHeading && flashcardTypes.includes('toggle'))
      return 'card';
    return 'skip';
  }

  const fixtureSet: Array<{
    name: string;
    file: string;
    rules: ClassifyRules;
  }> = [
    {
      name: 'toggle-only-default',
      file: '../../../test/fixtures/preview-intent/toggle-only-default.json',
      rules: DEFAULT_RULES,
    },
    {
      name: 'headings-as-cards',
      file: '../../../test/fixtures/preview-intent/headings-as-cards.json',
      rules: HEADING_RULES,
    },
    {
      name: 'recursive-page',
      file: '../../../test/fixtures/preview-intent/recursive-page.json',
      rules: DEFAULT_RULES,
    },
  ];

  for (const { name, file, rules } of fixtureSet) {
    describe(`fixture: ${name}`, () => {
      const entries: FixtureEntry[] = require(file);
      it.each(entries)(
        'type=$type hasToggleableHeading=$hasToggleableHeading: classifyBlock matches legacy predicate',
        ({ type, hasToggleableHeading }) => {
          expect(classifyBlock({ type, hasToggleableHeading }, rules)).toBe(
            legacyDecision(type, hasToggleableHeading, rules)
          );
        }
      );
    });
  }
});

describe('classifyBlock — direct cases', () => {
  it('returns card for explicit flashcard type', () => {
    expect(classifyBlock({ type: 'toggle' }, DEFAULT_RULES)).toBe('card');
  });

  it('returns recurse for child_page regardless of flashcardTypes', () => {
    expect(classifyBlock({ type: 'child_page' }, { flashcardTypes: [] })).toBe(
      'recurse'
    );
  });

  it('returns skip for paragraph with default rules', () => {
    expect(classifyBlock({ type: 'paragraph' }, DEFAULT_RULES)).toBe('skip');
  });

  it('returns skip for toggleable heading when toggle not in flashcardTypes', () => {
    expect(
      classifyBlock(
        { type: 'heading_1', hasToggleableHeading: true },
        { flashcardTypes: ['heading_2'] }
      )
    ).toBe('skip');
  });

  it('returns card for toggleable heading_4 when toggle is in flashcardTypes', () => {
    expect(
      classifyBlock(
        { type: 'heading_4', hasToggleableHeading: true },
        DEFAULT_RULES
      )
    ).toBe('card');
  });

  it('returns skip for non-toggleable heading_3 when only toggle in flashcardTypes', () => {
    expect(
      classifyBlock(
        { type: 'heading_3', hasToggleableHeading: false },
        DEFAULT_RULES
      )
    ).toBe('skip');
  });
});
