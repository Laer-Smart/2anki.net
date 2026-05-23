export type BlockDecision = 'card' | 'skip' | 'recurse';

export interface PreviewSettings {
  includeToggles: boolean;
  includeHeadings: boolean;
  recurseSubPages: boolean;
  columnsAsCards: boolean;
}

export function classifyBlock(
  block: { type: string; hasToggleableHeading?: boolean },
  settings: PreviewSettings
): BlockDecision {
  const { type, hasToggleableHeading } = block;

  if (type === 'child_page') {
    return settings.recurseSubPages ? 'recurse' : 'skip';
  }

  if (type === 'toggle' || hasToggleableHeading) {
    return settings.includeToggles ? 'card' : 'skip';
  }

  if (
    type === 'heading_1' ||
    type === 'heading_2' ||
    type === 'heading_3'
  ) {
    return settings.includeHeadings ? 'card' : 'skip';
  }

  if (type === 'column_list') {
    return settings.columnsAsCards ? 'card' : 'skip';
  }

  return 'card';
}
