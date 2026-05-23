import { describe, it, expect } from 'vitest';
import { classifyBlock, PreviewSettings } from './classifyBlock';

const allOn: PreviewSettings = {
  includeToggles: true,
  includeHeadings: true,
  recurseSubPages: true,
  columnsAsCards: true,
};

const allOff: PreviewSettings = {
  includeToggles: false,
  includeHeadings: false,
  recurseSubPages: false,
  columnsAsCards: false,
};

describe('classifyBlock', () => {
  it('returns card for paragraph regardless of settings', () => {
    expect(classifyBlock({ type: 'paragraph' }, allOff)).toBe('card');
    expect(classifyBlock({ type: 'paragraph' }, allOn)).toBe('card');
  });

  it('returns card for toggle when includeToggles is on', () => {
    expect(classifyBlock({ type: 'toggle' }, allOn)).toBe('card');
  });

  it('returns skip for toggle when includeToggles is off', () => {
    expect(classifyBlock({ type: 'toggle' }, allOff)).toBe('skip');
  });

  it('returns card for toggleable heading when includeToggles is on', () => {
    expect(
      classifyBlock({ type: 'heading_1', hasToggleableHeading: true }, allOn)
    ).toBe('card');
  });

  it('returns skip for toggleable heading when includeToggles is off', () => {
    expect(
      classifyBlock({ type: 'heading_1', hasToggleableHeading: true }, allOff)
    ).toBe('skip');
  });

  it.each(['heading_1', 'heading_2', 'heading_3'] as const)(
    'returns card for %s when includeHeadings is on',
    (type) => {
      expect(classifyBlock({ type }, { ...allOff, includeHeadings: true })).toBe('card');
    }
  );

  it.each(['heading_1', 'heading_2', 'heading_3'] as const)(
    'returns skip for %s when includeHeadings is off',
    (type) => {
      expect(classifyBlock({ type }, allOff)).toBe('skip');
    }
  );

  it('returns recurse for child_page when recurseSubPages is on', () => {
    expect(classifyBlock({ type: 'child_page' }, allOn)).toBe('recurse');
  });

  it('returns skip for child_page when recurseSubPages is off', () => {
    expect(classifyBlock({ type: 'child_page' }, allOff)).toBe('skip');
  });

  it('returns card for column_list when columnsAsCards is on', () => {
    expect(classifyBlock({ type: 'column_list' }, allOn)).toBe('card');
  });

  it('returns skip for column_list when columnsAsCards is off', () => {
    expect(classifyBlock({ type: 'column_list' }, allOff)).toBe('skip');
  });

  it('toggleable heading takes toggle precedence over heading setting', () => {
    const s: PreviewSettings = {
      ...allOff,
      includeToggles: true,
      includeHeadings: false,
    };
    expect(
      classifyBlock({ type: 'heading_2', hasToggleableHeading: true }, s)
    ).toBe('card');
  });
});
