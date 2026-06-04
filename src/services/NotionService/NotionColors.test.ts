import notionColorToHex, {
  NOTION_COLORS,
  isNotionColorBackground,
  styleWithColors,
} from './NotionColors';

describe('color mappings', () => {
  test('it converts text', () => {
    const color = notionColorToHex('red');
    expect(color).toBe('#E03E3E');
  });

  test('it converts background', () => {
    const color = notionColorToHex('red_background');
    expect(color).toBe('#E03E3E');
  });

  test('purple background uses the purple hex, not the red one', () => {
    expect(notionColorToHex('purple_background')).toBe('#6940A5');
  });

  test('each background color mirrors its text color', () => {
    const names = [
      'gray',
      'brown',
      'orange',
      'yellow',
      'green',
      'blue',
      'purple',
      'pink',
      'red',
    ];
    for (const name of names) {
      expect(notionColorToHex(`${name}_background`)).toBe(
        notionColorToHex(name)
      );
    }
  });

  test('it is background', () => {
    expect(isNotionColorBackground('red_background')).toBe(true);
  });

  test('isNotionColorBackground returns false for text colors and unknown tokens', () => {
    expect(isNotionColorBackground('red')).toBe(false);
    expect(isNotionColorBackground('default')).toBe(false);
    expect(isNotionColorBackground('unknown')).toBe(false);
  });

  test('table exposes all 19 Notion tokens (10 text + 9 backgrounds)', () => {
    expect(NOTION_COLORS).toHaveLength(19);
    const names = NOTION_COLORS.map((c) => c.name);

    const textNames = [
      'default',
      'gray',
      'brown',
      'orange',
      'yellow',
      'green',
      'blue',
      'purple',
      'pink',
      'red',
    ];
    for (const name of textNames) {
      expect(names).toContain(name);
    }

    const backgroundNames = [
      'gray_background',
      'brown_background',
      'orange_background',
      'yellow_background',
      'green_background',
      'blue_background',
      'purple_background',
      'pink_background',
      'red_background',
    ];
    for (const name of backgroundNames) {
      expect(names).toContain(name);
    }
  });

  test.each([
    ['default', '#37352F'],
    ['gray', '#9B9A97'],
    ['brown', '#64473A'],
    ['orange', '#D9730D'],
    ['yellow', '#DFAB01'],
    ['green', '#0F7B6C'],
    ['blue', '#0B6E99'],
    ['purple', '#6940A5'],
    ['pink', '#AD1A72'],
    ['red', '#E03E3E'],
  ])('text color %s maps to %s', (name, hex) => {
    expect(notionColorToHex(name)).toBe(hex);
  });

  test('unknown color falls back to default text color', () => {
    expect(notionColorToHex('not-a-notion-color')).toBe('#37352F');
    expect(notionColorToHex('')).toBe('#37352F');
  });

  describe('styleWithColors', () => {
    test('returns empty for default and missing color', () => {
      expect(styleWithColors()).toBe('');
      expect(styleWithColors('default')).toBe('');
      expect(styleWithColors(undefined)).toBe('');
    });

    test('emits the n2a-highlight-<token> class for every named color', () => {
      const tokens = NOTION_COLORS.map((c) => c.name).filter(
        (name) => name !== 'default'
      );
      for (const name of tokens) {
        expect(styleWithColors(name)).toBe(` n2a-highlight-${name}`);
      }
    });

    test('class name is preserved verbatim — never lowercased or remapped', () => {
      expect(styleWithColors('yellow_background')).toBe(
        ' n2a-highlight-yellow_background'
      );
      expect(styleWithColors('PURPLE_BACKGROUND')).toBe(
        ' n2a-highlight-PURPLE_BACKGROUND'
      );
    });
  });
});
