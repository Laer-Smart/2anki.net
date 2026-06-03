import fs from 'node:fs';
import path from 'node:path';

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

interface RawJsonTemplate {
  parent: string;
  name: string;
  front: string;
  back: string;
  fields: Array<{ name: string }>;
  styling: string;
}

interface OfficialStarter {
  id: string;
  name: string;
  description: string;
  baseType: string;
  noteType: {
    id: number;
    name: string;
    type: number;
    tmpls: Array<{
      name: string;
      ord: number;
      qfmt: string;
      afmt: string;
    }>;
    flds: Array<{ name: string; ord: number }>;
    css: string;
  };
  previewData: Record<string, string>;
  tags: string[];
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

function jsonStarter(spec: JsonStarterSpec): OfficialStarter | null {
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

function variantStarter(spec: VariantSpec): OfficialStarter | null {
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

function styledFromJson(spec: StyledJsonSpec): OfficialStarter | null {
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
  { name: 'Tags', ord: 2 },
];

const ABHIYAN_CLOZE_FLDS = [
  { name: 'Text', ord: 0 },
  { name: 'Extra', ord: 1 },
  { name: 'Tags', ord: 2 },
];

const ALEX_BASIC_FLDS = [
  { name: 'Front', ord: 0 },
  { name: 'Back', ord: 1 },
];

const ALEX_CLOZE_FLDS = [
  { name: 'Text', ord: 0 },
  { name: 'Extra', ord: 1 },
];

export function getOfficialTemplates(): OfficialStarter[] {
  idOffset = 0;
  const starters: Array<OfficialStarter | null> = [
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
      description: 'Cloze deletion that matches the standard 2anki conversion output',
      baseType: 'cloze',
      ankiType: 1,
      previewData: CLOZE_PREVIEW,
      tags: ['default', 'cloze', 'notion'],
    }),
    jsonStarter({
      file: 'n2a-input.json',
      id: 'official-n2a-input',
      name: 'Default (Type the answer)',
      description: 'Type-in-the-answer note type from the 2anki conversion pipeline',
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
      description: 'Notion-flavoured CSS only — strips the 2anki additions for a minimal Notion-native look',
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
      description: 'The bare note structure with no CSS applied — handy if you want to style it yourself',
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
      description: 'Dark, high-contrast Night Mode template by Abhiyan Bhandari',
      baseType: 'basic',
      ankiType: 0,
      qfmtFile: 'abhiyan_basic_front.html',
      afmtFile: 'abhiyan_basic_back.html',
      cssFile: 'abhiyan.css',
      flds: ABHIYAN_BASIC_FLDS,
      previewData: {
        Front: 'What is the capital of France?',
        Back: 'Paris',
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
        Tags: '',
      },
      tags: ['material', 'material-design', 'cloze'],
      modelName: 'Material Cloze',
    }),
  ];

  return starters.filter((s): s is OfficialStarter => s !== null);
}
