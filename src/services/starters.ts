import fs from 'node:fs';
import path from 'node:path';

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

export type StarterSurface = 'editor' | 'conversion' | 'both';

export interface StarterCardTemplate {
  name: string;
  ord: number;
  qfmt: string;
  afmt: string;
}

export interface StarterField {
  name: string;
  ord: number;
  sticky?: boolean;
  rtl?: boolean;
  font?: string;
  size?: number;
}

export interface StarterNoteType {
  id: number;
  name: string;
  type: number;
  mod?: number;
  usn?: number;
  sortf?: number;
  tmpls: StarterCardTemplate[];
  flds: StarterField[];
  css: string;
  tags?: string[];
}

export interface Starter {
  id: string;
  name: string;
  description: string;
  baseType: string;
  noteType: StarterNoteType;
  previewData: Record<string, string>;
  tags: string[];
  surface: StarterSurface;
}

interface RawJsonTemplate {
  parent: string;
  name: string;
  front: string;
  back: string;
  fields: Array<{ name: string }>;
  styling: string;
}

function readText(filename: string): string {
  return fs.readFileSync(path.join(TEMPLATES_DIR, filename), 'utf8');
}

function safeRead(filename: string): string | null {
  try {
    return readText(filename);
  } catch {
    return null;
  }
}

const STABLE_ID_BASE = Date.parse('2026-01-01');
let idOffset = 0;
function nextNoteTypeId(): number {
  idOffset += 1;
  return STABLE_ID_BASE + idOffset;
}

interface JsonStarterSpec {
  file: string;
  id: string;
  name: string;
  description: string;
  baseType: string;
  ankiType: number;
  previewData: Record<string, string>;
  tags: string[];
}

function jsonStarter(spec: JsonStarterSpec): Starter | null {
  const text = safeRead(spec.file);
  if (text == null) return null;
  let raw: RawJsonTemplate;
  try {
    raw = JSON.parse(text) as RawJsonTemplate;
  } catch {
    return null;
  }
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    baseType: spec.baseType,
    noteType: {
      id: nextNoteTypeId(),
      name: raw.name ?? spec.name,
      type: spec.ankiType,
      tmpls: [
        {
          name: raw.parent ?? 'Card 1',
          ord: 0,
          qfmt: raw.front,
          afmt: raw.back,
        },
      ],
      flds: raw.fields.map((f, i) => ({ name: f.name, ord: i })),
      css: raw.styling,
    },
    previewData: spec.previewData,
    tags: spec.tags,
    surface: 'conversion',
  };
}

interface VariantSpec {
  id: string;
  name: string;
  description: string;
  baseType: string;
  ankiType: number;
  qfmtFile: string;
  afmtFile: string;
  cssFile: string;
  flds: Array<{ name: string; ord: number }>;
  previewData: Record<string, string>;
  tags: string[];
  modelName?: string;
}

function variantStarter(spec: VariantSpec): Starter | null {
  const qfmt = safeRead(spec.qfmtFile);
  const afmt = safeRead(spec.afmtFile);
  const css = safeRead(spec.cssFile);
  if (qfmt == null || afmt == null || css == null) return null;
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    baseType: spec.baseType,
    noteType: {
      id: nextNoteTypeId(),
      name: spec.modelName ?? spec.name,
      type: spec.ankiType,
      tmpls: [{ name: 'Card 1', ord: 0, qfmt, afmt }],
      flds: spec.flds,
      css,
    },
    previewData: spec.previewData,
    tags: spec.tags,
    surface: 'conversion',
  };
}

interface StyledJsonSpec {
  id: string;
  name: string;
  description: string;
  baseType: string;
  ankiType: number;
  jsonFile: string;
  cssFile: string | null;
  previewData: Record<string, string>;
  tags: string[];
}

function styledFromJson(spec: StyledJsonSpec): Starter | null {
  const text = safeRead(spec.jsonFile);
  if (text == null) return null;
  let raw: RawJsonTemplate;
  try {
    raw = JSON.parse(text) as RawJsonTemplate;
  } catch {
    return null;
  }
  const css = spec.cssFile == null ? '' : (safeRead(spec.cssFile) ?? '');
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    baseType: spec.baseType,
    noteType: {
      id: nextNoteTypeId(),
      name: spec.name,
      type: spec.ankiType,
      tmpls: [
        {
          name: raw.parent ?? 'Card 1',
          ord: 0,
          qfmt: raw.front,
          afmt: raw.back,
        },
      ],
      flds: raw.fields.map((f, i) => ({ name: f.name, ord: i })),
      css,
    },
    previewData: spec.previewData,
    tags: spec.tags,
    surface: 'conversion',
  };
}

const BASIC_PREVIEW = {
  Front: 'What is the capital of France?',
  Back: 'Paris',
  MyMedia: '',
};

const CLOZE_PREVIEW = {
  Text: 'The capital of {{c1::France}} is {{c2::Paris}}',
  Extra: 'European geography',
  MyMedia: '',
};

const ABHIYAN_BASIC_FLDS = [
  { name: 'Front', ord: 0 },
  { name: 'Back', ord: 1 },
  { name: 'Image', ord: 2 },
  { name: 'Tags', ord: 3 },
];

const ABHIYAN_CLOZE_FLDS = [
  { name: 'Text', ord: 0 },
  { name: 'Extra', ord: 1 },
  { name: 'Image', ord: 2 },
  { name: 'Tags', ord: 3 },
];

const ALEX_BASIC_FLDS = [
  { name: 'Front', ord: 0 },
  { name: 'Back', ord: 1 },
];

const ALEX_CLOZE_FLDS = [
  { name: 'Text', ord: 0 },
  { name: 'Extra', ord: 1 },
];

function buildConversionStarters(): Starter[] {
  idOffset = 0;
  const starters: Array<Starter | null> = [
    jsonStarter({
      file: 'n2a-basic.json',
      id: 'official-n2a-basic',
      name: 'Default (Basic)',
      description:
        'The classic 2anki look — Notion-styled basic note type, used by every standard conversion',
      baseType: 'basic',
      ankiType: 0,
      previewData: BASIC_PREVIEW,
      tags: ['default', 'basic', 'notion'],
    }),
    jsonStarter({
      file: 'n2a-cloze.json',
      id: 'official-n2a-cloze',
      name: 'Default (Cloze)',
      description:
        'Cloze deletion that matches the standard 2anki conversion output',
      baseType: 'cloze',
      ankiType: 1,
      previewData: CLOZE_PREVIEW,
      tags: ['default', 'cloze', 'notion'],
    }),
    jsonStarter({
      file: 'n2a-input.json',
      id: 'official-n2a-input',
      name: 'Default (Type the answer)',
      description:
        'Type-in-the-answer note type from the 2anki conversion pipeline',
      baseType: 'basic',
      ankiType: 0,
      previewData: {
        Front: 'Capital of France?',
        Back: 'Paris',
        Input: 'Paris',
        MyMedia: '',
      },
      tags: ['default', 'input', 'type-the-answer'],
    }),
    jsonStarter({
      file: 'n2a-io.json',
      id: 'official-n2a-io',
      name: 'Image Occlusion',
      description:
        "Anki's image-occlusion note type, kept in sync with the 2anki conversion target",
      baseType: 'cloze',
      ankiType: 1,
      previewData: {
        Header: 'Cell anatomy',
        Image: '',
        Occlusion: '{{c1::Nucleus}}',
        'Back Extra': 'Mitochondria is the powerhouse of the cell.',
        Comments: '',
      },
      tags: ['image-occlusion'],
    }),
    styledFromJson({
      id: 'official-only-notion-basic',
      name: 'Only Notion (Basic)',
      description:
        'Notion-flavoured CSS only — strips the 2anki additions for a minimal Notion-native look',
      baseType: 'basic',
      ankiType: 0,
      jsonFile: 'n2a-basic.json',
      cssFile: 'notion.css',
      previewData: BASIC_PREVIEW,
      tags: ['notionstyle', 'notion'],
    }),
    styledFromJson({
      id: 'official-only-notion-cloze',
      name: 'Only Notion (Cloze)',
      description: 'Notion-only styling on the cloze base type',
      baseType: 'cloze',
      ankiType: 1,
      jsonFile: 'n2a-cloze.json',
      cssFile: 'notion.css',
      previewData: CLOZE_PREVIEW,
      tags: ['notionstyle', 'notion', 'cloze'],
    }),
    styledFromJson({
      id: 'official-no-style-basic',
      name: 'Raw Note (no style)',
      description:
        'The bare note structure with no CSS applied — handy if you want to style it yourself',
      baseType: 'basic',
      ankiType: 0,
      jsonFile: 'n2a-basic.json',
      cssFile: null,
      previewData: BASIC_PREVIEW,
      tags: ['nostyle'],
    }),
    variantStarter({
      id: 'official-abhiyan-basic',
      name: 'Abhiyan Bhandari (Night Mode)',
      description:
        'Dark, high-contrast Night Mode template by Abhiyan Bhandari',
      baseType: 'basic',
      ankiType: 0,
      qfmtFile: 'abhiyan_basic_front.html',
      afmtFile: 'abhiyan_basic_back.html',
      cssFile: 'abhiyan.css',
      flds: ABHIYAN_BASIC_FLDS,
      previewData: {
        Front: 'What is the capital of France?',
        Back: 'Paris',
        Image: '',
        Tags: '',
      },
      tags: ['abhiyan', 'night-mode'],
      modelName: 'Abhiyan Basic',
    }),
    variantStarter({
      id: 'official-abhiyan-cloze',
      name: 'Abhiyan Bhandari (Night Mode — Cloze)',
      description: 'Night Mode applied to cloze deletions',
      baseType: 'cloze',
      ankiType: 1,
      qfmtFile: 'abhiyan_cloze_front.html',
      afmtFile: 'abhiyan_cloze_back.html',
      cssFile: 'abhiyan_cloze_style.css',
      flds: ABHIYAN_CLOZE_FLDS,
      previewData: {
        Text: 'The capital of {{c1::France}} is {{c2::Paris}}',
        Extra: 'European geography',
        Image: '',
        Tags: '',
      },
      tags: ['abhiyan', 'night-mode', 'cloze'],
      modelName: 'Abhiyan Cloze',
    }),
    variantStarter({
      id: 'official-alex-deluxe-basic',
      name: 'Alexander Deluxe (Blue)',
      description: 'A blue, deluxe basic template by Alexander',
      baseType: 'basic',
      ankiType: 0,
      qfmtFile: 'alex_deluxe_basic_front.html',
      afmtFile: 'alex_deluxe_basic_back.html',
      cssFile: 'alex_deluxe.css',
      flds: ALEX_BASIC_FLDS,
      previewData: { Front: 'What is the capital of France?', Back: 'Paris' },
      tags: ['alex_deluxe', 'blue'],
      modelName: 'Alex Deluxe Basic',
    }),
    variantStarter({
      id: 'official-alex-deluxe-cloze',
      name: 'Alexander Deluxe (Blue — Cloze)',
      description: 'Cloze variant of the Alexander Deluxe template',
      baseType: 'cloze',
      ankiType: 1,
      qfmtFile: 'alex_deluxe_cloze_front.html',
      afmtFile: 'alex_deluxe_cloze_back.html',
      cssFile: 'alex_deluxe_cloze_style.css',
      flds: ALEX_CLOZE_FLDS,
      previewData: {
        Text: 'The capital of {{c1::France}} is {{c2::Paris}}',
        Extra: 'European geography',
      },
      tags: ['alex_deluxe', 'blue', 'cloze'],
      modelName: 'Alex Deluxe Cloze',
    }),
    variantStarter({
      id: 'official-material-basic',
      name: 'Material (Basic)',
      description:
        'Clean Material Design card — elevated surface, Roboto type, primary-blue answer accent. Light and dark ready',
      baseType: 'basic',
      ankiType: 0,
      qfmtFile: 'material_basic_front.html',
      afmtFile: 'material_basic_back.html',
      cssFile: 'material.css',
      flds: ABHIYAN_BASIC_FLDS,
      previewData: {
        Front: 'What is the capital of France?',
        Back: 'Paris',
        Image: '',
        Tags: '',
      },
      tags: ['material', 'material-design'],
      modelName: 'Material Basic',
    }),
    variantStarter({
      id: 'official-material-cloze',
      name: 'Material (Cloze)',
      description:
        'Material Design cloze deletion — blanks highlighted in primary blue, readable on light and dark backgrounds',
      baseType: 'cloze',
      ankiType: 1,
      qfmtFile: 'material_cloze_front.html',
      afmtFile: 'material_cloze_back.html',
      cssFile: 'material_cloze_style.css',
      flds: ABHIYAN_CLOZE_FLDS,
      previewData: {
        Text: 'The capital of {{c1::France}} is {{c2::Paris}}',
        Extra: 'European geography',
        Image: '',
        Tags: '',
      },
      tags: ['material', 'material-design', 'cloze'],
      modelName: 'Material Cloze',
    }),
  ];

  return starters.filter((s): s is Starter => s !== null);
}

function field(
  name: string,
  ord: number,
  font = 'Inter',
  size = 20
): StarterField {
  return { name, ord, sticky: false, rtl: false, font, size };
}

interface InlineNoteTypeInput {
  id: number;
  name: string;
  type?: number;
  tmpls: StarterCardTemplate[];
  flds: StarterField[];
  css: string;
  tags?: string[];
}

function inlineNoteType({
  id,
  name,
  type = 0,
  tmpls,
  flds,
  css,
  tags = [],
}: InlineNoteTypeInput): StarterNoteType {
  return {
    id,
    name,
    type,
    mod: 0,
    usn: -1,
    sortf: 0,
    tmpls,
    flds,
    css,
    tags,
  };
}

function getBasicNoteType(): StarterNoteType {
  return inlineNoteType({
    id: 1000000000000,
    name: 'Basic',
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: '<div class="front">\n  <h1>{{Front}}</h1>\n</div>',
        afmt: '<div class="back">\n  <div class="question">{{Front}}</div>\n  <hr id="answer">\n  <div class="answer">{{Back}}</div>\n</div>',
      },
    ],
    flds: [field('Front', 0), field('Back', 1)],
    css: `.card {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 20px;
  text-align: center;
  color: #1f2937;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: cover;
  background-repeat: no-repeat;
  min-height: 100vh;
  padding: 40px;
  margin: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card > * {
  max-width: 600px;
  width: 100%;
}

.front h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.back {
  color: white;
}

.question {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 20px;
  opacity: 0.8;
}

.answer {
  font-size: 2rem;
  font-weight: 700;
  margin-top: 20px;
}

hr {
  border: none;
  height: 2px;
  background: rgba(255, 255, 255, 0.3);
  margin: 20px 0;
  border-radius: 1px;
}`,
  });
}

function getClozeNoteType(): StarterNoteType {
  return inlineNoteType({
    id: 1000000000001,
    name: 'Cloze',
    type: 1,
    tmpls: [
      {
        name: 'Cloze',
        ord: 0,
        qfmt: '<div class="cloze-question">\n  {{cloze:Text}}\n</div>',
        afmt: '<div class="cloze-answer">\n  {{cloze:Text}}\n  {{#Extra}}\n    <div class="extra">{{Extra}}</div>\n  {{/Extra}}\n</div>',
      },
    ],
    flds: [field('Text', 0), field('Extra', 1, 'Inter', 16)],
    css: `.card {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 20px;
  text-align: center;
  color: #ffffff;
  background: linear-gradient(135deg, #1e3a5f 0%, #0f2027 100%);
  min-height: 100%;
  padding: 40px;
  margin: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.cloze-question, .cloze-answer {
  color: #e2e8f0;
  line-height: 1.8;
  font-size: 1.3rem;
}

.cloze {
  font-weight: 700;
  background: rgba(99, 179, 237, 0.2);
  color: #63b3ed;
  padding: 4px 10px;
  border-radius: 6px;
  border-bottom: 2px solid #63b3ed;
}

.extra {
  margin-top: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.75);
  border-left: 4px solid #63b3ed;
}`,
  });
}

function getVocabNoteType(): StarterNoteType {
  return inlineNoteType({
    id: 1000000000010,
    name: 'Vocabulary',
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: `<div class="vocab-front">
  <div class="word">{{Word}}</div>
  <div class="reading">{{Reading}}</div>
</div>`,
        afmt: `<div class="vocab-back">
  <div class="word">{{Word}}</div>
  <div class="reading">{{Reading}}</div>
  <hr class="divider">
  <div class="meaning">{{Meaning}}</div>
  {{#Example}}
  <div class="example">
    <div class="example-sentence">{{Example}}</div>
    <div class="example-translation">{{ExampleTranslation}}</div>
  </div>
  {{/Example}}
</div>`,
      },
    ],
    flds: [
      field('Word', 0),
      field('Reading', 1, 'Inter', 16),
      field('Meaning', 2),
      field('Example', 3, 'Inter', 16),
      field('ExampleTranslation', 4, 'Inter', 16),
    ],
    css: `.card {
  font-family: 'Noto Sans', 'Hiragino Sans', 'Yu Gothic', 'Inter', sans-serif;
  background: #fafaf9;
  min-height: 100%;
  margin: 0;
  padding: 32px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.vocab-front, .vocab-back {
  width: 100%;
  max-width: 480px;
  text-align: center;
}

.word {
  font-size: 2.8rem;
  font-weight: 700;
  color: #1c1917;
  line-height: 1.2;
  margin-bottom: 8px;
}

.reading {
  font-size: 1.1rem;
  color: #78716c;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.divider {
  border: none;
  height: 1px;
  background: #e7e5e4;
  margin: 24px auto;
  width: 60%;
}

.meaning {
  font-size: 1.3rem;
  color: #292524;
  font-weight: 500;
  margin-bottom: 20px;
}

.example {
  background: #f5f5f4;
  border-radius: 12px;
  padding: 16px 20px;
  border-left: 3px solid #a78bfa;
  text-align: left;
}

.example-sentence {
  font-size: 1rem;
  color: #1c1917;
  margin-bottom: 6px;
  line-height: 1.6;
}

.example-translation {
  font-size: 0.9rem;
  color: #78716c;
  font-style: italic;
}`,
  });
}

function getMedicalNoteType(): StarterNoteType {
  return inlineNoteType({
    id: 1000000000011,
    name: 'Medical Term',
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: `<div class="medical-front">
  <div class="label">Define</div>
  <div class="term">{{Term}}</div>
</div>`,
        afmt: `<div class="medical-back">
  <div class="term-small">{{Term}}</div>
  <div class="definition">{{Definition}}</div>
  {{#Mnemonic}}
  <div class="mnemonic">
    <span class="mnemonic-label">Mnemonic</span>
    {{Mnemonic}}
  </div>
  {{/Mnemonic}}
</div>`,
      },
    ],
    flds: [
      field('Term', 0),
      field('Definition', 1, 'Inter', 16),
      field('Mnemonic', 2, 'Inter', 16),
      field('Image', 3, 'Inter', 16),
    ],
    css: `.card {
  font-family: 'Inter', -apple-system, sans-serif;
  background: #f0f9ff;
  min-height: 100%;
  margin: 0;
  padding: 32px 24px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.medical-front, .medical-back {
  width: 100%;
  max-width: 480px;
  text-align: center;
}

.label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #0284c7;
  margin-bottom: 12px;
}

.term {
  font-size: 2.2rem;
  font-weight: 700;
  color: #0c4a6e;
  line-height: 1.2;
}

.term-small {
  font-size: 1.1rem;
  font-weight: 600;
  color: #0284c7;
  margin-bottom: 16px;
}

.definition {
  font-size: 1.1rem;
  color: #1e3a5f;
  line-height: 1.7;
  margin-bottom: 20px;
}

.mnemonic {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  padding: 14px 18px;
  font-size: 0.95rem;
  color: #9a3412;
  line-height: 1.5;
  text-align: left;
}

.mnemonic-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #c2410c;
  margin-bottom: 4px;
}`,
  });
}

function getProgrammingNoteType(): StarterNoteType {
  return inlineNoteType({
    id: 1000000000012,
    name: 'Code Card',
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: `<div class="code-front">
  <div class="question">{{Question}}</div>
</div>`,
        afmt: `<div class="code-back">
  <div class="question-small">{{Question}}</div>
  <pre class="code-block"><code>{{Answer}}</code></pre>
  {{#Notes}}
  <div class="notes">{{Notes}}</div>
  {{/Notes}}
</div>`,
      },
    ],
    flds: [
      field('Question', 0),
      field('Answer', 1, 'Fira Code', 14),
      field('Notes', 2, 'Inter', 14),
    ],
    css: `.card {
  font-family: 'Inter', -apple-system, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  min-height: 100%;
  margin: 0;
  padding: 28px 20px;
  box-sizing: border-box;
}

.code-front, .code-back {
  max-width: 560px;
  margin: 0 auto;
}

.question {
  font-size: 1.25rem;
  font-weight: 600;
  color: #f1f5f9;
  line-height: 1.5;
  margin-bottom: 8px;
  text-align: center;
}

.question-small {
  font-size: 0.9rem;
  color: #94a3b8;
  margin-bottom: 16px;
  text-align: center;
}

.code-block {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 20px;
  margin: 0 0 16px;
  overflow-x: auto;
  text-align: left;
}

.code-block code {
  font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.9rem;
  color: #7dd3fc;
  white-space: pre;
  line-height: 1.7;
}

.notes {
  background: #1e293b;
  border-left: 3px solid #818cf8;
  border-radius: 0 8px 8px 0;
  padding: 12px 16px;
  font-size: 0.88rem;
  color: #cbd5e1;
  line-height: 1.6;
}`,
  });
}

function getMinimalNoteType(): StarterNoteType {
  return inlineNoteType({
    id: 1000000000013,
    name: 'Minimal',
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: `<div class="minimal-front">
  <div class="question">{{Front}}</div>
</div>`,
        afmt: `<div class="minimal-back">
  <div class="question-repeat">{{Front}}</div>
  <div class="answer">{{Back}}</div>
</div>`,
      },
    ],
    flds: [field('Front', 0), field('Back', 1)],
    css: `.card {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #ffffff;
  min-height: 100%;
  margin: 0;
  padding: 40px 32px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.minimal-front, .minimal-back {
  width: 100%;
  max-width: 480px;
  text-align: center;
}

.question {
  font-size: 1.5rem;
  font-weight: 500;
  color: #111827;
  line-height: 1.5;
}

.question-repeat {
  font-size: 1rem;
  color: #9ca3af;
  margin-bottom: 24px;
  line-height: 1.5;
}

.answer {
  font-size: 1.6rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
}`,
  });
}

function getQuoteNoteType(): StarterNoteType {
  return inlineNoteType({
    id: 1000000000014,
    name: 'Quote',
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: `<div class="quote-front">
  <div class="quotemark">"</div>
  <blockquote class="quote-text">{{Quote}}</blockquote>
</div>`,
        afmt: `<div class="quote-back">
  <div class="quotemark">"</div>
  <blockquote class="quote-text">{{Quote}}</blockquote>
  <div class="attribution">
    <span class="author">— {{Author}}</span>
    {{#Context}}<span class="context">{{Context}}</span>{{/Context}}
  </div>
</div>`,
      },
    ],
    flds: [
      field('Quote', 0),
      field('Author', 1, 'Inter', 16),
      field('Context', 2, 'Inter', 14),
    ],
    css: `.card {
  font-family: 'Georgia', 'Palatino', serif;
  background: #1c1917;
  min-height: 100%;
  margin: 0;
  padding: 40px 32px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quote-front, .quote-back {
  width: 100%;
  max-width: 500px;
  text-align: center;
}

.quotemark {
  font-size: 6rem;
  line-height: 0.5;
  color: #a78bfa;
  margin-bottom: 16px;
  font-family: Georgia, serif;
}

.quote-text {
  font-size: 1.25rem;
  font-style: italic;
  color: #f5f5f4;
  line-height: 1.8;
  margin: 0 0 24px;
}

.attribution {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.author {
  font-size: 1rem;
  font-weight: 600;
  color: #a78bfa;
  font-style: normal;
  font-family: 'Inter', sans-serif;
}

.context {
  font-size: 0.82rem;
  color: #78716c;
  font-style: normal;
  font-family: 'Inter', sans-serif;
}`,
  });
}

function getMathNoteType(): StarterNoteType {
  return inlineNoteType({
    id: 1000000000015,
    name: 'Math & Science',
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: `<div class="math-front">
  <div class="label">Problem</div>
  <div class="problem">{{Problem}}</div>
  {{#Context}}
  <div class="context">{{Context}}</div>
  {{/Context}}
</div>`,
        afmt: `<div class="math-back">
  <div class="problem-echo">{{Problem}}</div>
  <hr class="divider">
  <div class="solution">{{Solution}}</div>
  {{#Steps}}
  <div class="steps">
    <div class="steps-label">Derivation</div>
    {{Steps}}
  </div>
  {{/Steps}}
  {{#Context}}
  <div class="context">{{Context}}</div>
  {{/Context}}
</div>`,
      },
    ],
    flds: [
      field('Problem', 0),
      field('Solution', 1),
      field('Steps', 2, 'Inter', 16),
      field('Context', 3, 'Inter', 14),
    ],
    css: `.card {
  font-family: 'Inter', -apple-system, sans-serif;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100%;
  margin: 0;
  padding: 32px 24px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e2e8f0;
}

.math-front, .math-back {
  width: 100%;
  max-width: 520px;
  text-align: center;
}

.label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #7dd3fc;
  margin-bottom: 14px;
}

.problem {
  font-size: 1.3rem;
  color: #f1f5f9;
  line-height: 1.6;
  font-weight: 400;
}

.problem-echo {
  font-size: 0.9rem;
  color: #94a3b8;
  margin-bottom: 16px;
  line-height: 1.5;
}

.divider {
  border: none;
  border-top: 1px solid #334155;
  margin: 16px 0;
}

.solution {
  font-size: 1.4rem;
  font-weight: 500;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.08);
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 16px;
  line-height: 1.6;
}

.steps {
  background: rgba(125, 211, 252, 0.06);
  border: 1px solid rgba(125, 211, 252, 0.15);
  border-radius: 10px;
  padding: 14px 18px;
  font-size: 0.88rem;
  color: #cbd5e1;
  line-height: 1.8;
  text-align: left;
  margin-bottom: 12px;
}

.steps-label {
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #7dd3fc;
  margin-bottom: 8px;
}

.context {
  font-size: 0.78rem;
  color: #64748b;
  margin-top: 10px;
  font-style: italic;
}

mjx-container {
  color: inherit !important;
}`,
  });
}

function getBasicReversedNoteType(): StarterNoteType {
  return inlineNoteType({
    id: 1000000000016,
    name: 'Basic (Reversed)',
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: '<div class="front">\n  <h1>{{Front}}</h1>\n</div>',
        afmt: '<div class="back">\n  <div class="question">{{Front}}</div>\n  <hr id="answer">\n  <div class="answer">{{Back}}</div>\n</div>',
      },
      {
        name: 'Card 2',
        ord: 1,
        qfmt: '<div class="front">\n  <h1>{{Back}}</h1>\n</div>',
        afmt: '<div class="back">\n  <div class="question">{{Back}}</div>\n  <hr id="answer">\n  <div class="answer">{{Front}}</div>\n</div>',
      },
    ],
    flds: [field('Front', 0), field('Back', 1)],
    css: `.card {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 20px;
  text-align: center;
  color: #1f2937;
  background: #ffffff;
  min-height: 100vh;
  padding: 40px;
  margin: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card > * {
  max-width: 600px;
  width: 100%;
}

.front h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.question {
  font-size: 1.5rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 20px;
}

.answer {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin-top: 20px;
}

hr {
  border: none;
  height: 2px;
  background: #e5e7eb;
  margin: 20px 0;
  border-radius: 1px;
}`,
  });
}

function getInputNoteType(): StarterNoteType {
  return inlineNoteType({
    id: 1000000000017,
    name: 'Type the answer',
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: '<div class="front">\n  <div class="prompt">{{Front}}</div>\n  <div class="input-row">{{type:Back}}</div>\n</div>',
        afmt: '<div class="back">\n  <div class="prompt">{{Front}}</div>\n  <div class="input-row">{{type:Back}}</div>\n</div>',
      },
    ],
    flds: [field('Front', 0), field('Back', 1)],
    css: `.card {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 20px;
  text-align: center;
  color: #1f2937;
  background: #ffffff;
  min-height: 100vh;
  padding: 40px;
  margin: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card > * {
  max-width: 600px;
  width: 100%;
}

.prompt {
  font-size: 1.8rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 24px;
}

.input-row {
  font-size: 1.4rem;
}

input[type="text"] {
  font-family: inherit;
  font-size: 1.4rem;
  padding: 12px 16px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  width: 100%;
  max-width: 400px;
  box-sizing: border-box;
}`,
  });
}

const HIERARCHY_BREADCRUMB = `<div class="breadcrumb">{{#H1}}<span class="crumb">{{H1}}</span>{{/H1}}{{#H2}}<span class="crumb-sep">›</span><span class="crumb">{{H2}}</span>{{/H2}}{{#H3}}<span class="crumb-sep">›</span><span class="crumb">{{H3}}</span>{{/H3}}</div>`;

function getHierarchyNoteType(): StarterNoteType {
  return inlineNoteType({
    id: 1000000000018,
    name: 'Hierarchy',
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: `<div class="hierarchy-front">
  ${HIERARCHY_BREADCRUMB}
  <div class="question">{{Question}}</div>
</div>`,
        afmt: `<div class="hierarchy-back">
  ${HIERARCHY_BREADCRUMB}
  <div class="question-small">{{Question}}</div>
  <hr id="answer">
  <div class="answer">{{Answer}}</div>
</div>`,
      },
    ],
    flds: [
      field('H1', 0, 'Inter', 14),
      field('H2', 1, 'Inter', 14),
      field('H3', 2, 'Inter', 14),
      field('Question', 3),
      field('Answer', 4),
    ],
    css: `.card {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 20px;
  text-align: center;
  color: #1f2937;
  background: #ffffff;
  min-height: 100vh;
  padding: 40px;
  margin: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card > * {
  max-width: 600px;
  width: 100%;
}

.breadcrumb {
  font-size: 0.8rem;
  color: #9ca3af;
  margin-bottom: 16px;
}

.breadcrumb .crumb-sep {
  margin: 0 6px;
}

.breadcrumb .crumb-sep:first-child {
  display: none;
}

.question {
  font-size: 1.8rem;
  font-weight: 600;
  color: #111827;
}

.question-small {
  font-size: 1.1rem;
  color: #6b7280;
  margin-bottom: 16px;
}

.answer {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin-top: 16px;
}

hr {
  border: none;
  height: 1px;
  background: #e5e7eb;
  margin: 16px 0;
}`,
  });
}

function buildEditorStarters(): Starter[] {
  return [
    {
      id: 'basic-clean',
      name: 'Clean Basic',
      description: 'A minimal, clean basic note type',
      baseType: 'basic',
      noteType: getBasicNoteType(),
      previewData: { Front: 'What is the capital of France?', Back: 'Paris' },
      tags: ['basic', 'minimal'],
      surface: 'editor',
    },
    {
      id: 'cloze-modern',
      name: 'Modern Cloze',
      description: 'A stylish cloze deletion template',
      baseType: 'cloze',
      noteType: getClozeNoteType(),
      previewData: {
        Text: 'The capital of {{c1::France}} is {{c2::Paris}}.',
        Extra: 'France is located in Western Europe.',
      },
      tags: ['cloze', 'geography'],
      surface: 'editor',
    },
    {
      id: 'vocab-language',
      name: 'Vocabulary Card',
      description:
        'Language learning — word, reading, meaning, example sentence',
      baseType: 'basic',
      noteType: getVocabNoteType(),
      previewData: {
        Word: '勉強',
        Reading: 'べんきょう',
        Meaning: 'study; to study',
        Example: '毎日日本語を勉強しています。',
        ExampleTranslation: 'I study Japanese every day.',
      },
      tags: ['language', 'vocabulary', 'japanese'],
      surface: 'editor',
    },
    {
      id: 'medical-term',
      name: 'Medical Term',
      description: 'Anatomy / medical — term, definition, mnemonic',
      baseType: 'basic',
      noteType: getMedicalNoteType(),
      previewData: {
        Term: 'Mitral Valve',
        Definition:
          'The bicuspid valve between the left atrium and left ventricle of the heart',
        Mnemonic: 'MItral = left sIde (both have I)',
        Image: '',
      },
      tags: ['medical', 'anatomy'],
      surface: 'editor',
    },
    {
      id: 'programming-snippet',
      name: 'Code Card',
      description: 'Programming — question with code block answer',
      baseType: 'basic',
      noteType: getProgrammingNoteType(),
      previewData: {
        Question: 'How do you reverse a string in Python?',
        Answer:
          's = "hello"\nreversed_s = s[::-1]\nprint(reversed_s)  # "olleh"',
        Notes:
          'Slice notation [start:stop:step] with step -1 iterates backwards.',
      },
      tags: ['programming', 'python', 'code'],
      surface: 'editor',
    },
    {
      id: 'minimal-white',
      name: 'Minimal',
      description: 'Clean white card — distraction-free reading',
      baseType: 'basic',
      noteType: getMinimalNoteType(),
      previewData: {
        Front: 'What is the powerhouse of the cell?',
        Back: 'The mitochondria',
      },
      tags: ['minimal', 'clean'],
      surface: 'editor',
    },
    {
      id: 'quote-card',
      name: 'Quote',
      description: 'A large featured quote with author attribution',
      baseType: 'basic',
      noteType: getQuoteNoteType(),
      previewData: {
        Quote: 'The only way to do great work is to love what you do.',
        Author: 'Steve Jobs',
        Context: 'Stanford Commencement Address, 2005',
      },
      tags: ['quotes', 'inspiration'],
      surface: 'editor',
    },
    {
      id: 'math-science',
      name: 'Math & Science',
      description:
        'MathJax-ready template for equations, proofs, and scientific notation',
      baseType: 'basic',
      noteType: getMathNoteType(),
      previewData: {
        Problem: 'Evaluate ∫₀^∞ e^(−x²) dx',
        Solution: '√π / 2',
        Steps:
          'Square the integral and convert to polar coordinates:<br>I² = ∫∫ e^(−(x²+y²)) dx dy → polar → π/4<br>Therefore I = √π / 2',
        Context:
          'Gaussian integral — probability, thermodynamics, quantum mechanics',
      },
      tags: ['math', 'science', 'equations'],
      surface: 'editor',
    },
    {
      id: 'basic-reversed',
      name: 'Basic (Reversed)',
      description:
        'One note, two cards — forward and reverse. Standard for bidirectional language drills.',
      baseType: 'basic',
      noteType: getBasicReversedNoteType(),
      previewData: { Front: '勉強', Back: 'study; to study' },
      tags: ['basic', 'reversed', 'language'],
      surface: 'editor',
    },
    {
      id: 'input-type-the-answer',
      name: 'Type the answer',
      description:
        'Type your answer — Anki diffs it against the expected value. Standard for spelling and recall drills.',
      baseType: 'basic',
      noteType: getInputNoteType(),
      previewData: { Front: 'Capital of France?', Back: 'Paris' },
      tags: ['basic', 'input', 'type-the-answer'],
      surface: 'editor',
    },
    {
      id: 'hierarchy',
      name: 'Hierarchy',
      description:
        'Question with its H1 › H2 › H3 breadcrumb — heading context on every card.',
      baseType: 'basic',
      noteType: getHierarchyNoteType(),
      previewData: {
        H1: 'Biology',
        H2: 'Cell division',
        H3: 'Mitosis',
        Question: 'What happens during prophase?',
        Answer: 'Chromosomes condense and the mitotic spindle begins to form',
      },
      tags: ['basic', 'hierarchy', 'structure'],
      surface: 'editor',
    },
  ];
}

export function getStarters(): Starter[] {
  return [...buildConversionStarters(), ...buildEditorStarters()];
}

export function listConversionStarters(): Starter[] {
  return getStarters().filter((s) => s.surface !== 'editor');
}

export function listEditorStarters(): Starter[] {
  return getStarters().filter((s) => s.surface !== 'conversion');
}

export {
  getBasicNoteType,
  getClozeNoteType,
  getVocabNoteType,
  getMedicalNoteType,
  getProgrammingNoteType,
  getMinimalNoteType,
  getQuoteNoteType,
  getMathNoteType,
  getBasicReversedNoteType,
  getInputNoteType,
  getHierarchyNoteType,
};
