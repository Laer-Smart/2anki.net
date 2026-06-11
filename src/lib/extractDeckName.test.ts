import { extractName } from './extractDeckName';
import CardOption from './parser/Settings/CardOption';

const createInput = (
  name: string,
  pageIcon: string | null,
  decksCount: number,
  pageEmoji: string
) => ({
  name,
  pageIcon,
  decksCount,
  settings: { pageEmoji },
});

const createExpectedOutput = (
  name: string,
  pageIcon: string | null,
  pageEmoji: string
) => {
  if (pageIcon === null || name.includes(pageIcon)) {
    return name;
  }
  return pageEmoji === 'first_emoji'
    ? `${pageIcon} ${name}`
    : `${name} ${pageIcon}`;
};

const testCases = [
  {
    description: 'should return the correct deck name when pageIcon is null',
    input: createInput('Default::My Deck', null, 0, 'first_emoji'),
    expected: 'Default::My Deck',
  },
  {
    description:
      'should return the name with pageIcon prefixed when settings.pageEmoji is "first_emoji"',
    input: createInput('My Deck', 'Default', 0, 'first_emoji'),
    expected: 'Default My Deck',
  },
  {
    description:
      'should return the name with pageIcon suffixed when settings.pageEmoji is not "first_emoji"',
    input: createInput('My Deck', 'Default', 0, 'last_emoji'),
    expected: 'My Deck Default',
  },
  {
    description: 'should handle names with "::" correctly',
    input: createInput('Default::My Deck', 'Default', 0, 'first_emoji'),
    expected: 'Default::My Deck',
  },
  {
    description:
      'should return the original name if pageIcon is included in the name',
    input: createInput('Default::My Deck', 'Default', 1, 'first_emoji'),
    expected: 'Default::My Deck',
  },
  {
    description: 'should handle newlines in the deck name correctly',
    input: createInput('Default\nMy Deck', 'Default', 0, 'first_emoji'),
    expected: 'Default My Deck',
  },
];

describe('extractDeckName', () => {
  testCases.forEach(({ description, input, expected }) => {
    it(description, () => {
      expect(extractName(input)).toBe(expected);
    });
  });

  it('puts the page emoji first on the default options path', () => {
    const settings = new CardOption(CardOption.LoadDefaultOptions());
    const name = extractName({
      name: 'My Deck',
      pageIcon: '📘',
      decksCount: 0,
      settings,
    });
    expect(name).toBe('📘 My Deck');
  });
});
