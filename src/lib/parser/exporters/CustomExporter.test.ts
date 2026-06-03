import os from 'os';
import path from 'path';
import fs from 'fs';

import CustomExporter from './CustomExporter';
import { DeckTooLargeError } from './DeckTooLargeError';
import Deck from '../Deck';
import Note from '../Note';
import CardOption from '../Settings';

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'custom-exporter-test-'));
}

function emptySettings(): CardOption {
  return new CardOption({});
}

function autoDetectSettings(): CardOption {
  return new CardOption({ 'tts-auto-detect': 'true' });
}

function deckWithCards(name: string, fronts: string[], settings: CardOption): Deck {
  const cards = fronts.map((front) => new Note(front, ''));
  return new Deck(name, cards, '', '', 1, settings);
}

describe('CustomExporter.configure', () => {
  it('throws DeckTooLargeError when JSON.stringify throws a RangeError', () => {
    const dir = tempDir();
    const exporter = new CustomExporter('test-deck', dir);

    const originalStringify = JSON.stringify;
    JSON.stringify = () => {
      throw new RangeError('Invalid string length');
    };

    try {
      expect(() => exporter.configure([] as Deck[])).toThrow(DeckTooLargeError);
    } finally {
      JSON.stringify = originalStringify;
    }
  });

  it('re-throws non-RangeError exceptions from JSON.stringify unchanged', () => {
    const dir = tempDir();
    const exporter = new CustomExporter('test-deck', dir);

    const originalStringify = JSON.stringify;
    JSON.stringify = () => {
      throw new TypeError('unexpected');
    };

    try {
      expect(() => exporter.configure([] as Deck[])).toThrow(TypeError);
    } finally {
      JSON.stringify = originalStringify;
    }
  });

  it('writes deck_info.json when serialization succeeds', () => {
    const dir = tempDir();
    const exporter = new CustomExporter('test-deck', dir);
    const deck = new Deck('My Deck', [], '', '', 1234567890123456, emptySettings());

    exporter.configure([deck]);

    const written = fs.readFileSync(path.join(dir, 'deck_info.json'), 'utf8');
    const parsed = JSON.parse(written);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].name).toBe('My Deck');
  });

  it('leaves frontLang empty when auto-detect is off', () => {
    const dir = tempDir();
    const exporter = new CustomExporter('test-deck', dir);
    const deck = deckWithCards('JP', ['こんにちは', 'ありがとう'], emptySettings());

    exporter.configure([deck]);

    const parsed = JSON.parse(fs.readFileSync(path.join(dir, 'deck_info.json'), 'utf8'));
    expect(parsed[0].settings.frontLang).toBe('');
  });

  it('writes detected frontLang when auto-detect is on and CJK dominates', () => {
    const dir = tempDir();
    const exporter = new CustomExporter('test-deck', dir);
    const deck = deckWithCards(
      'JP',
      ['こんにちは', 'ありがとう', 'すみません'],
      autoDetectSettings()
    );

    exporter.configure([deck]);

    const parsed = JSON.parse(fs.readFileSync(path.join(dir, 'deck_info.json'), 'utf8'));
    expect(parsed[0].settings.frontLang).toBe('ja');
  });

  it('falls back to en when auto-detect is on and text is ASCII', () => {
    const dir = tempDir();
    const exporter = new CustomExporter('test-deck', dir);
    const deck = deckWithCards('EN', ['hello', 'thanks'], autoDetectSettings());

    exporter.configure([deck]);

    const parsed = JSON.parse(fs.readFileSync(path.join(dir, 'deck_info.json'), 'utf8'));
    expect(parsed[0].settings.frontLang).toBe('en');
  });

  it('serializes the manual TTS language and side into deck_info.json', () => {
    const dir = tempDir();
    const exporter = new CustomExporter('test-deck', dir);
    const settings = new CardOption({
      'tts-manual-lang': 'ja_JP',
      'tts-manual-side': 'both',
    });
    const deck = deckWithCards('JP', ['front'], settings);

    exporter.configure([deck]);

    const parsed = JSON.parse(fs.readFileSync(path.join(dir, 'deck_info.json'), 'utf8'));
    expect(parsed[0].settings.ttsManualLang).toBe('ja_JP');
    expect(parsed[0].settings.ttsManualSide).toBe('both');
  });

  it('skips auto-detect when a manual TTS language is set', () => {
    const dir = tempDir();
    const exporter = new CustomExporter('test-deck', dir);
    const settings = new CardOption({
      'tts-auto-detect': 'true',
      'tts-manual-lang': 'es_ES',
      'tts-manual-side': 'front',
    });
    const deck = deckWithCards('JP', ['こんにちは', 'ありがとう', 'すみません'], settings);

    exporter.configure([deck]);

    const parsed = JSON.parse(fs.readFileSync(path.join(dir, 'deck_info.json'), 'utf8'));
    expect(parsed[0].settings.frontLang).toBe('');
    expect(parsed[0].settings.ttsManualLang).toBe('es_ES');
  });
});
