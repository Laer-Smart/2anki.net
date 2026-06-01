export type OverlappingClozeStyle = 'show-all' | 'windowed';

function clozeOne(item: string): string {
  return `{{c1::${item}}}`;
}

function renderShowAll(items: string[], target: number): string {
  return items
    .map((item, index) => (index === target ? clozeOne(item) : item))
    .join('<br />');
}

function renderWindowed(items: string[], target: number): string {
  const start = Math.max(0, target - 1);
  const end = Math.min(items.length - 1, target + 1);
  const window: string[] = [];
  for (let index = start; index <= end; index++) {
    window.push(index === target ? clozeOne(items[index]) : items[index]);
  }
  return window.join('<br />');
}

export default function handleOverlappingCloze(
  items: string[],
  style: OverlappingClozeStyle
): string[] {
  const cleaned = items
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (cleaned.length === 0) {
    return [];
  }

  return cleaned.map((_item, target) =>
    style === 'windowed'
      ? renderWindowed(cleaned, target)
      : renderShowAll(cleaned, target)
  );
}
