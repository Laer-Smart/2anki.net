import { getOfficialTemplates } from './officialTemplates';
import { validateTemplateFields } from '../lib/templates/validateTemplateFields';

describe('getOfficialTemplates', () => {
  const templates = getOfficialTemplates();

  it('returns every documented official template', () => {
    expect(templates.length).toBeGreaterThanOrEqual(10);
    const ids = templates.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'official-n2a-basic',
        'official-n2a-cloze',
        'official-n2a-input',
        'official-n2a-io',
        'official-only-notion-basic',
        'official-only-notion-cloze',
        'official-no-style-basic',
        'official-abhiyan-basic',
        'official-abhiyan-cloze',
        'official-alex-deluxe-basic',
        'official-alex-deluxe-cloze',
        'official-material-basic',
        'official-material-cloze',
      ])
    );
  });

  it('wires the Material basic template with its files', () => {
    const material = templates.find((t) => t.id === 'official-material-basic');
    expect(material?.noteType.tmpls[0].qfmt).toContain('{{Front}}');
    expect(material?.noteType.css).toContain('.md-card');
  });

  it('wires the Material cloze template with its highlight styling', () => {
    const material = templates.find((t) => t.id === 'official-material-cloze');
    expect(material?.noteType.type).toBe(1);
    expect(material?.noteType.tmpls[0].qfmt).toContain('{{cloze:Text}}');
    expect(material?.noteType.css).toContain('.cloze');
  });

  it('shapes each entry as a NoteTypeStarter', () => {
    for (const template of templates) {
      expect(template).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        baseType: expect.any(String),
        noteType: {
          name: expect.any(String),
          tmpls: expect.any(Array),
          flds: expect.any(Array),
          css: expect.any(String),
        },
        previewData: expect.any(Object),
        tags: expect.any(Array),
      });
      expect(template.noteType.tmpls.length).toBeGreaterThan(0);
      expect(template.noteType.flds.length).toBeGreaterThan(0);
    }
  });

  it('marks the cloze and image-occlusion templates as cloze type', () => {
    const cloze = templates.find((t) => t.id === 'official-n2a-cloze');
    const io = templates.find((t) => t.id === 'official-n2a-io');
    expect(cloze?.noteType.type).toBe(1);
    expect(io?.noteType.type).toBe(1);
  });

  it('keeps the Anki template HTML in qfmt/afmt', () => {
    const basic = templates.find((t) => t.id === 'official-n2a-basic');
    expect(basic?.noteType.tmpls[0].qfmt).toContain('{{Front}}');
    expect(basic?.noteType.tmpls[0].afmt).toContain('{{Back}}');
  });

  it('returns the Raw Note variant with an empty CSS string', () => {
    const raw = templates.find((t) => t.id === 'official-no-style-basic');
    expect(raw?.noteType.css).toBe('');
  });

  it('only references fields that exist on the note type', () => {
    const failures: string[] = [];
    for (const template of templates) {
      const result = validateTemplateFields(template.noteType);
      if (!result.ok) {
        failures.push(`${template.id}: ${result.message}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('exposes an Image field on Abhiyan basic and references it in the template', () => {
    const abhiyanBasic = templates.find(
      (t) => t.id === 'official-abhiyan-basic'
    );
    expect(abhiyanBasic?.noteType.flds.map((f) => f.name)).toContain('Image');
    expect(abhiyanBasic?.noteType.tmpls[0].qfmt).toContain('{{#Image}}');
    expect(abhiyanBasic?.noteType.tmpls[0].qfmt).toContain('{{Image}}');
    expect(abhiyanBasic?.previewData).toHaveProperty('Image');
  });

  it('exposes an Image field on Abhiyan cloze and references it in the template', () => {
    const abhiyanCloze = templates.find(
      (t) => t.id === 'official-abhiyan-cloze'
    );
    expect(abhiyanCloze?.noteType.flds.map((f) => f.name)).toContain('Image');
    expect(abhiyanCloze?.noteType.tmpls[0].qfmt).toContain('{{#Image}}');
    expect(abhiyanCloze?.noteType.tmpls[0].afmt).toContain('{{#Image}}');
    expect(abhiyanCloze?.previewData).toHaveProperty('Image');
  });
});
