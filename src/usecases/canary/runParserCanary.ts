import path from 'path';
import fs from 'fs';

import { DeckParser } from '../../lib/parser/DeckParser';
import CardOption from '../../lib/parser/Settings';
import Workspace from '../../lib/parser/WorkSpace';

export interface CanarySnapshot {
  cardCount: number;
  imageCount: number;
  clozeCount: number;
}

export interface CanaryFixtureDefinition {
  name: string;
  snapshot: CanarySnapshot;
}

export interface CanaryFailure {
  fixtureName: string;
  expected: CanarySnapshot;
  actual: CanarySnapshot;
}

export type CanaryResult =
  | { status: 'pass'; failures: [] }
  | { status: 'fail'; failures: CanaryFailure[] };

const FIXTURES_DIR = path.join(__dirname, '../../lib/parser/__fixtures__');

export const CANARY_FIXTURES: CanaryFixtureDefinition[] = [
  {
    name: 'notion-html-2024',
    snapshot: { cardCount: 3, imageCount: 1, clozeCount: 3 },
  },
  {
    name: 'mcq-canary',
    snapshot: { cardCount: 1, imageCount: 0, clozeCount: 0 },
  },
];

async function measureFixture(name: string): Promise<CanarySnapshot> {
  const fixtureDir = path.join(FIXTURES_DIR, name);
  const html = fs.readFileSync(path.join(fixtureDir, 'index.html')).toString();

  const extraFiles: { name: string; contents: Buffer | string }[] = [];
  const mediaSubdir = path.join(fixtureDir, name);
  if (fs.existsSync(mediaSubdir)) {
    for (const entry of fs.readdirSync(mediaSubdir)) {
      const fullPath = path.join(mediaSubdir, entry);
      if (fs.statSync(fullPath).isFile()) {
        extraFiles.push({
          name: `${name}/${entry}`,
          contents: fs.readFileSync(fullPath),
        });
      }
    }
  }

  const settings = new CardOption({
    'max-one-toggle-per-card': 'true',
    cherry: 'false',
    cloze: 'true',
    'mcq-enabled': 'true',
  });
  const parser = new DeckParser({
    name: 'index.html',
    settings,
    files: [{ name: 'index.html', contents: html }, ...extraFiles],
    noLimits: true,
    workspace: new Workspace(true, 'fs'),
  });
  parser.customExporter.save = () => Promise.resolve(Buffer.alloc(0));
  await parser.build(new Workspace(true, 'fs'));

  const cards = parser.payload.flatMap((d) => d.cards);
  const cardCount = cards.length;
  const imageCount = cards.reduce((sum, c) => sum + (c.media?.length ?? 0), 0);
  const clozeCount = cards.filter((c) => c.cloze).length;

  return { cardCount, imageCount, clozeCount };
}

export async function runParserCanary(
  fixtures: CanaryFixtureDefinition[] = CANARY_FIXTURES
): Promise<CanaryResult> {
  const failures: CanaryFailure[] = [];

  for (const fixture of fixtures) {
    const actual = await measureFixture(fixture.name);
    const { snapshot: expected } = fixture;

    if (
      actual.cardCount !== expected.cardCount ||
      actual.imageCount !== expected.imageCount ||
      actual.clozeCount !== expected.clozeCount
    ) {
      failures.push({ fixtureName: fixture.name, expected, actual });
    }
  }

  if (failures.length === 0) {
    return { status: 'pass', failures: [] };
  }
  return { status: 'fail', failures };
}
