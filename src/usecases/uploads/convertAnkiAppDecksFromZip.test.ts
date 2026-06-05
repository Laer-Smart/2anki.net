import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  ANKI_APP_ZIP_NO_DECK_MESSAGE,
  convertAnkiAppDecksFromZip,
} from './convertAnkiAppDecksFromZip';
import { ANKI_APP_MALFORMED_XML_MESSAGE } from '../../lib/parser/parsers/parseAnkiAppXml';
import Workspace from '../../lib/parser/WorkSpace';

const DECK_XML = `<deck name="Geography">
  <cards>
    <card>
      <field name="Front">Capital of France</field>
      <field name="Back">Paris</field>
    </card>
    <card>
      <field name="Front">What sound is this?</field>
      <field name="Back"><audio id="abc"/></field>
    </card>
  </cards>
</deck>`;

describe('convertAnkiAppDecksFromZip', () => {
  let workspace: Workspace;

  beforeEach(() => {
    process.env.SKIP_CREATE_DECK = 'true';
    workspace = {
      location: fs.mkdtempSync(path.join(os.tmpdir(), 'ankiapp-zip-test-')),
    } as Workspace;
  });

  afterEach(() => {
    delete process.env.SKIP_CREATE_DECK;
    fs.rmSync(workspace.location, { recursive: true, force: true });
  });

  it('converts every deck XML inside the zip and ignores blobs', async () => {
    const result = await convertAnkiAppDecksFromZip(
      [
        { name: 'cards.xml', contents: DECK_XML },
        { name: 'blobs/a1b2c3', contents: Buffer.from([1, 2, 3]) },
      ],
      workspace
    );

    expect(result).not.toBeNull();
    expect(result!.packages).toHaveLength(1);
    expect(result!.packages[0].name).toBe('Geography.apkg');
    expect(result!.packages[0].cardCount).toBe(1);
    expect(result!.warnings).toEqual(['1 card skipped (media-only)']);
  });

  it('detects deck XML by content even when the entry is not named cards.xml', async () => {
    const result = await convertAnkiAppDecksFromZip(
      [{ name: 'export-2024', contents: DECK_XML }],
      workspace
    );

    expect(result).not.toBeNull();
    expect(result!.packages[0].name).toBe('Geography.apkg');
  });

  it('throws the no-deck message for a zip with blobs but no deck XML', async () => {
    await expect(
      convertAnkiAppDecksFromZip(
        [{ name: 'blobs/a1b2c3', contents: Buffer.from([1, 2, 3]) }],
        workspace
      )
    ).rejects.toThrow(ANKI_APP_ZIP_NO_DECK_MESSAGE);
  });

  it('surfaces the malformed message for an xml-only zip whose XML is not a deck', async () => {
    await expect(
      convertAnkiAppDecksFromZip(
        [{ name: 'cards.xml', contents: '<sitemap><url/></sitemap>' }],
        workspace
      )
    ).rejects.toThrow(ANKI_APP_MALFORMED_XML_MESSAGE);
  });

  it('returns null for zips without any AnkiApp signature', async () => {
    const result = await convertAnkiAppDecksFromZip(
      [{ name: 'export/page.html', contents: '<html></html>' }],
      workspace
    );

    expect(result).toBeNull();
  });

  it('leaves mixed zips with convertible files to the regular pipeline', async () => {
    const result = await convertAnkiAppDecksFromZip(
      [
        { name: 'notes/page.html', contents: '<html></html>' },
        { name: 'sitemap.xml', contents: '<sitemap><url/></sitemap>' },
      ],
      workspace
    );

    expect(result).toBeNull();
  });
});
