import { isChatCardTemplate, templatePromptSuffix } from './chatTemplates';

describe('isChatCardTemplate', () => {
  it.each(['basic', 'basic-and-reversed', 'cloze', 'mcq'] as const)(
    'returns true for valid slug "%s"',
    (slug) => {
      expect(isChatCardTemplate(slug)).toBe(true);
    }
  );

  it.each([null, undefined, '', 'image-occlusion', 123])(
    'returns false for invalid value %s',
    (value) => {
      expect(isChatCardTemplate(value)).toBe(false);
    }
  );
});

describe('templatePromptSuffix', () => {
  it('returns a non-empty suffix for basic that forbids cloze and mcq', () => {
    const suffix = templatePromptSuffix('basic');
    expect(suffix.length).toBeGreaterThan(0);
    expect(suffix).toMatch(/front/i);
    expect(suffix).toMatch(/back/i);
    expect(suffix).toMatch(/\{\{c/);
    expect(suffix).toMatch(/cloze/i);
    expect(suffix).toMatch(/multiple.choice|mcq/i);
  });

  it('returns a non-empty suffix for basic-and-reversed', () => {
    const suffix = templatePromptSuffix('basic-and-reversed');
    expect(suffix.length).toBeGreaterThan(0);
    expect(suffix).toMatch(/both directions/i);
  });

  it('returns a cloze-specific suffix for cloze template', () => {
    const suffix = templatePromptSuffix('cloze');
    expect(suffix).toMatch(/cloze/i);
    expect(suffix).toMatch(/\{\{c1::/);
  });

  it('returns an mcq-specific suffix for mcq template', () => {
    const suffix = templatePromptSuffix('mcq');
    expect(suffix).toMatch(/multiple.choice/i);
    expect(suffix).toMatch(/correct_index/);
    expect(suffix).toMatch(/four options/);
  });
});
