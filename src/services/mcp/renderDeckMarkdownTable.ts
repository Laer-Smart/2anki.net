export interface DeckTableCard {
  front: string;
  back: string;
  direction?: 'forward' | 'reverse';
}

export interface RenderDeckMarkdownTableOptions {
  headerLines: string[];
  cards: DeckTableCard[];
  maxRows?: number;
  totalCount?: number | null;
  note?: string;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function directionArrow(direction: DeckTableCard['direction']): string {
  if (direction === 'reverse') return '←';
  if (direction === 'forward') return '→';
  return '—';
}

export function renderDeckMarkdownTable(
  options: RenderDeckMarkdownTableOptions
): string {
  const { headerLines, cards, maxRows, note } = options;
  const lines: string[] = [...headerLines];

  if (cards.length === 0) {
    return lines.join('\n');
  }

  const shown = maxRows == null ? cards : cards.slice(0, maxRows);
  const showDirection = shown.some((card) => card.direction != null);

  lines.push('');
  lines.push(
    showDirection ? '| # | Dir | Front | Back |' : '| # | Front | Back |'
  );
  lines.push(
    showDirection ? '|--:|:---:|-------|------|' : '|--:|-------|------|'
  );

  shown.forEach((card, index) => {
    const front = escapeCell(card.front);
    const back = escapeCell(card.back);
    if (showDirection) {
      lines.push(
        `| ${index + 1} | ${directionArrow(card.direction)} | ${front} | ${back} |`
      );
    } else {
      lines.push(`| ${index + 1} | ${front} | ${back} |`);
    }
  });

  const total = options.totalCount ?? cards.length;
  if (note) {
    lines.push('');
    lines.push(`_${note}_`);
  } else if (shown.length < total) {
    lines.push('');
    lines.push(
      `_Showing ${shown.length} of ${total}. Ask for the full preview to see more._`
    );
  }

  return lines.join('\n');
}
