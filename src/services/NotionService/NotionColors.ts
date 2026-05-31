export const NOTION_COLORS = [
  { name: 'default', color: '#37352F' },
  { name: 'gray', color: '#9B9A97' },
  { name: 'brown', color: '#64473A' },
  { name: 'orange', color: '#D9730D' },
  { name: 'yellow', color: '#DFAB01' },
  { name: 'green', color: '#0F7B6C' },
  { name: 'blue', color: '#0B6E99' },
  { name: 'purple', color: '#6940A5' },
  { name: 'pink', color: '#AD1A72' },
  { name: 'red', color: '#E03E3E' },
  { name: 'gray_background', color: '#9B9A97' },
  { name: 'brown_background', color: '#64473A' },
  { name: 'orange_background', color: '#D9730D' },
  { name: 'yellow_background', color: '#DFAB01' },
  { name: 'green_background', color: '#0F7B6C' },
  { name: 'blue_background', color: '#0B6E99' },
  { name: 'purple_background', color: '#6940A5' },
  { name: 'pink_background', color: '#AD1A72' },
  { name: 'red_background', color: '#E03E3E' },
];

export default function notionColorToHex(color: string) {
  const match = NOTION_COLORS.find((c) => c.name === color);
  return match?.color ?? NOTION_COLORS[0].color;
}

export function isNotionColorBackground(color: string) {
  return color.endsWith('_background');
}

export function styleWithColors(color?: string): string {
  if (!color || color === 'default') {
    return '';
  }
  return ` n2a-highlight-${color}`;
}
