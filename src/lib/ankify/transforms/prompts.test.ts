import { buildTransformPrompt } from './prompts';
import { ParsedNote } from './types';

const basicNote: ParsedNote = {
  guid: 'g-1',
  modelKind: 'basic',
  modelName: 'Basic',
  fields: ['What is the mitochondrion?', 'The powerhouse of the cell.'],
  fieldNames: ['Front', 'Back'],
  tags: [],
};

describe('buildTransformPrompt', () => {
  describe('translate_back', () => {
    it('embeds the target language and source fields', () => {
      const result = buildTransformPrompt('translate_back', basicNote, 'Spanish');
      const payload = JSON.parse(result.user);
      expect(payload.target_language).toBe('Spanish');
      expect(payload.field_to_translate).toBe(basicNote.fields[1]);
      expect(payload.context_front).toBe(basicNote.fields[0]);
      expect(result.system).toContain('JSON only');
    });

    it('requires a target language', () => {
      expect(() =>
        buildTransformPrompt('translate_back', basicNote, undefined)
      ).toThrow('translate_back requires targetLanguage');
    });
  });

  describe('add_example', () => {
    it('strips HTML before sending to the model', () => {
      const noteWithHtml: ParsedNote = {
        ...basicNote,
        fields: [
          '<b>What is the mitochondrion?</b>',
          '<i>The powerhouse</i> of the <span>cell</span>.',
        ],
      };
      const result = buildTransformPrompt('add_example', noteWithHtml, undefined);
      const payload = JSON.parse(result.user);
      expect(payload.front).toBe('What is the mitochondrion?');
      expect(payload.back).toBe('The powerhouse of the cell.');
      expect(result.system).toContain('one example sentence');
    });
  });

  describe('cloze_front', () => {
    it('asks for a {{c1::...}} sentence', () => {
      const result = buildTransformPrompt('cloze_front', basicNote, undefined);
      expect(result.system).toContain('{{c1::');
    });
  });

  describe('add_hint', () => {
    it('asks for one short hint', () => {
      const result = buildTransformPrompt('add_hint', basicNote, undefined);
      expect(result.system).toContain('hint');
      expect(result.system).toContain('without giving the answer away');
    });
  });
});
