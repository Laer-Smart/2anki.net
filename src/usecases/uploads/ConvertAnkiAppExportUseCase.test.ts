import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { convertAnkiAppExportToApkg } from './ConvertAnkiAppExportUseCase';
import { ANKI_APP_NO_CARDS_MESSAGE } from '../../lib/parser/parsers/parseAnkiAppXml';

const SAMPLE_XML = `<deck name="French Translation Deck">
  <fields>
    <text lang="en-US" name="Text" sides="11"></text>
    <text lang="fr-FR" name="Translation" sides="01"></text>
  </fields>
  <cards>
    <card>
      <field name="Text">Hello</field>
      <field name="Translation">Bonjour</field>
    </card>
  </cards>
</deck>`;

describe('convertAnkiAppExportToApkg', () => {
  let outputDir: string;

  beforeEach(() => {
    process.env.SKIP_CREATE_DECK = 'true';
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ankiapp-test-'));
  });

  afterEach(() => {
    delete process.env.SKIP_CREATE_DECK;
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it('writes a deck payload from the parsed XML', async () => {
    const result = await convertAnkiAppExportToApkg(
      'cards.xml',
      Buffer.from(SAMPLE_XML),
      outputDir
    );

    expect(result.deckName).toBe('French Translation Deck.apkg');
    expect(result.cardCount).toBe(1);
    expect(result.skippedMediaOnlyCount).toBe(0);

    const payload = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'deck_info.json'), 'utf-8')
    );
    expect(payload[0].name).toBe('French Translation Deck');
    expect(payload[0].cards).toHaveLength(1);
    expect(payload[0].cards[0].name).toBe('Hello');
    expect(payload[0].cards[0].back).toBe('Bonjour');
  });

  it('falls back to the filename when the deck has no name attribute', async () => {
    const xml = '<deck><cards><card><field name="F">a</field><field name="B">b</field></card></cards></deck>';

    const result = await convertAnkiAppExportToApkg(
      'My AnkiApp Deck.xml',
      Buffer.from(xml),
      outputDir
    );

    expect(result.deckName).toBe('My AnkiApp Deck.apkg');
  });

  it('propagates parser errors', async () => {
    const xml = '<deck name="Empty"><cards></cards></deck>';

    await expect(
      convertAnkiAppExportToApkg('cards.xml', Buffer.from(xml), outputDir)
    ).rejects.toThrow(ANKI_APP_NO_CARDS_MESSAGE);
  });
});
