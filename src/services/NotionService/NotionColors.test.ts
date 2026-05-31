import notionColorToHex, { isNotionColorBackground } from './NotionColors';

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
});
