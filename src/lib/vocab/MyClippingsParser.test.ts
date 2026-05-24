import { parseMyClippings, groupByBook } from './MyClippingsParser';

const EN_SINGLE = [
  'Sapiens (Yuval Noah Harari)',
  '- Your Highlight on page 23 | Location 156-158 | Added on Friday, January 1, 2021 12:00:00 PM',
  '',
  'Cognitive revolution was a turning point.',
  '==========',
].join('\n');

const DE_SINGLE = [
  'Im Westen nichts Neues (Erich Maria Remarque)',
  '- Ihre Markierung bei Position 234-236 | Hinzugefügt am Montag, 4. Januar 2021 09:15:00',
  '',
  'Wir sind alle nur eine Generation.',
  '==========',
].join('\n');

const ES_SINGLE = [
  'Cien años de soledad (Gabriel García Márquez)',
  '- Tu subrayado en la página 12 | posición 100-102 | Añadido el martes, 5 de enero de 2021 10:30:00',
  '',
  'Muchos años después, frente al pelotón de fusilamiento.',
  '==========',
].join('\n');

const FR_SINGLE = [
  "L'Étranger (Albert Camus)",
  "- Votre surlignement à la page 7 | emplacement 50-52 | Ajouté le mercredi 6 janvier 2021 14:00:00",
  '',
  "Aujourd'hui, maman est morte.",
  '==========',
].join('\n');

const EN_BOOKMARK = [
  'Sapiens (Yuval Noah Harari)',
  '- Your Bookmark on page 5 | Location 30 | Added on Friday, January 1, 2021',
  '',
  '',
  '==========',
].join('\n');

const EN_NOTE = [
  'Sapiens (Yuval Noah Harari)',
  '- Your Note on page 23 | Location 156 | Added on Friday, January 1, 2021',
  '',
  'A useful note from the reader.',
  '==========',
].join('\n');

const MULTI_BOOK = [EN_SINGLE, DE_SINGLE].join('\n');

const NO_AUTHOR = [
  'Untitled Manuscript',
  '- Your Highlight on page 1 | Location 1-3 | Added on Friday, January 1, 2021',
  '',
  'A passage with no author parens.',
  '==========',
].join('\n');

const NON_LOCALE = [
  '日本語の本 (作者)',
  '- ハイライト 23ページ | 位置 156-158 | 追加日 2021年1月1日',
  '',
  '日本語のハイライトテキスト。',
  '==========',
].join('\n');

describe('parseMyClippings', () => {
  it('parses an English highlight entry', () => {
    const { entries, skipped } = parseMyClippings(EN_SINGLE);
    expect(skipped).toBe(0);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      book: 'Sapiens',
      author: 'Yuval Noah Harari',
      highlight: 'Cognitive revolution was a turning point.',
      locale: 'en',
    });
    expect(entries[0].date).toContain('January 1, 2021');
  });

  it('parses a German highlight entry', () => {
    const { entries } = parseMyClippings(DE_SINGLE);
    expect(entries).toHaveLength(1);
    expect(entries[0].locale).toBe('de');
    expect(entries[0].book).toBe('Im Westen nichts Neues');
    expect(entries[0].author).toBe('Erich Maria Remarque');
    expect(entries[0].highlight).toBe('Wir sind alle nur eine Generation.');
  });

  it('parses a Spanish highlight entry', () => {
    const { entries } = parseMyClippings(ES_SINGLE);
    expect(entries).toHaveLength(1);
    expect(entries[0].locale).toBe('es');
    expect(entries[0].book).toBe('Cien años de soledad');
    expect(entries[0].author).toBe('Gabriel García Márquez');
  });

  it('parses a French highlight entry', () => {
    const { entries } = parseMyClippings(FR_SINGLE);
    expect(entries).toHaveLength(1);
    expect(entries[0].locale).toBe('fr');
    expect(entries[0].book).toBe("L'Étranger");
    expect(entries[0].author).toBe('Albert Camus');
  });

  it('skips bookmark entries (no body)', () => {
    const { entries, skipped } = parseMyClippings(EN_BOOKMARK);
    expect(entries).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it('treats notes as highlights', () => {
    const { entries } = parseMyClippings(EN_NOTE);
    expect(entries).toHaveLength(1);
    expect(entries[0].highlight).toBe('A useful note from the reader.');
  });

  it('parses multiple entries across multiple books', () => {
    const { entries } = parseMyClippings(MULTI_BOOK);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.book)).toEqual([
      'Sapiens',
      'Im Westen nichts Neues',
    ]);
  });

  it('handles a missing author gracefully', () => {
    const { entries } = parseMyClippings(NO_AUTHOR);
    expect(entries).toHaveLength(1);
    expect(entries[0].book).toBe('Untitled Manuscript');
    expect(entries[0].author).toBe('');
  });

  it('skips entries in unsupported locales', () => {
    const { entries, skipped } = parseMyClippings(NON_LOCALE);
    expect(entries).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it('returns no entries on an empty file', () => {
    expect(parseMyClippings('')).toEqual({ entries: [], skipped: 0 });
  });

  it('strips the UTF-8 BOM if present', () => {
    const withBom = '﻿' + EN_SINGLE;
    const { entries } = parseMyClippings(withBom);
    expect(entries).toHaveLength(1);
    expect(entries[0].book).toBe('Sapiens');
  });

  it('tolerates CRLF line endings', () => {
    const crlf = EN_SINGLE.replace(/\n/g, '\r\n');
    const { entries } = parseMyClippings(crlf);
    expect(entries).toHaveLength(1);
    expect(entries[0].highlight).toBe('Cognitive revolution was a turning point.');
  });
});

describe('groupByBook', () => {
  it('groups entries by book preserving insertion order', () => {
    const { entries } = parseMyClippings(MULTI_BOOK);
    const groups = groupByBook(entries);
    expect(Array.from(groups.keys())).toEqual([
      'Sapiens',
      'Im Westen nichts Neues',
    ]);
    expect(groups.get('Sapiens')).toHaveLength(1);
  });

  it('returns an empty map when there are no entries', () => {
    expect(groupByBook([]).size).toBe(0);
  });
});
