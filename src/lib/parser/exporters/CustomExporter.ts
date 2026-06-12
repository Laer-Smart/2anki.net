import path from 'path';
import fs, { PathLike } from 'fs';

import CardGenerator from '../../anki/CardGenerator';
import { detectFrontLanguage } from '../../anki/detectCardLanguage';
import { track } from '../../../services/events/track';
import { resolveSafeEntryPath } from '../../vocab/safeEntryPath';
import Deck from '../Deck';
import { DeckTooLargeError } from './DeckTooLargeError';

const FRONT_SAMPLE_LIMIT = 25;

function applyAutoDetectedLang(payload: Deck[]): void {
  if (payload.length === 0) return;
  const settings = payload[0].settings;
  if (settings == null) return;
  const manualLangSet = settings.ttsManualLang !== '';
  if (manualLangSet || !settings.ttsAutoDetect) return;

  const samples: string[] = [];
  for (const deck of payload) {
    for (const card of deck.cards) {
      if (samples.length >= FRONT_SAMPLE_LIMIT) break;
      const front = card.name ?? '';
      if (front) samples.push(front);
    }
    if (samples.length >= FRONT_SAMPLE_LIMIT) break;
  }

  const detected = detectFrontLanguage(samples);
  if (!detected) return;
  settings.frontLang = detected;
  track('tts_lang_injected', { props: { lang: detected } });
}

class CustomExporter {
  firstDeckName: string;

  workspace: string;

  media: string[];

  constructor(firstDeckName: string, workspace: string) {
    this.firstDeckName = firstDeckName.replace('.html', '');
    this.workspace = workspace;
    this.media = [];
  }

  addMedia(newName: string, contents: string | Buffer) {
    const abs = resolveSafeEntryPath(path.basename(newName), this.workspace);
    this.media.push(abs);
    fs.writeFileSync(abs, contents);
    return abs;
  }

  configure(payload: Deck[]) {
    applyAutoDetectedLang(payload);
    let serialized: string;
    try {
      serialized = JSON.stringify(payload, null, 2);
    } catch (err) {
      if (err instanceof RangeError) {
        throw new DeckTooLargeError();
      }
      throw err;
    }
    fs.writeFileSync(this.getPayloadInfoPath(), serialized);
  }

  async save(): Promise<Buffer> {
    const gen = new CardGenerator(this.workspace);
    if (process.env.SKIP_CREATE_DECK) {
      return fs.promises.readFile(this.getPayloadInfoPath());
    }
    const apkgPath = (await gen.run()) as string;
    return fs.promises.readFile(apkgPath);
  }

  deckInfoPath(): string {
    return path.join(this.workspace, 'deck_info.json');
  }

  getPayloadInfoPath(): PathLike {
    return this.deckInfoPath();
  }
}

export default CustomExporter;
