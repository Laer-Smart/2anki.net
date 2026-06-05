import { synthesizeCardsFromPdfHeadings } from './synthesizeCardsFromPdfHeadings';
import type { PdfPage } from './synthesizeCardsFromPdf';

describe('synthesizeCardsFromPdfHeadings', () => {
  it('starts a new card at a short line followed by longer body text', () => {
    const pages: PdfPage[] = [
      {
        text: [
          'What is mitosis?',
          'Cell division producing two genetically identical daughter cells.',
          'What is meiosis?',
          'Cell division producing four genetically unique daughter cells.',
        ].join('\n'),
      },
    ];

    const cards = synthesizeCardsFromPdfHeadings(pages, 'Biology');

    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      front: 'What is mitosis?',
      back: 'Cell division producing two genetically identical daughter cells.',
    });
    expect(cards[1]).toMatchObject({
      front: 'What is meiosis?',
      back: 'Cell division producing four genetically unique daughter cells.',
    });
  });

  it('joins multiple body lines under one heading', () => {
    const pages: PdfPage[] = [
      {
        text: [
          'Photosynthesis',
          'Light-dependent reactions happen in the thylakoid membrane first.',
          'The Calvin cycle then fixes carbon dioxide in the stroma afterwards.',
        ].join('\n'),
      },
    ];

    const cards = synthesizeCardsFromPdfHeadings(pages, 'Bio');

    expect(cards).toHaveLength(1);
    expect(cards[0].back).toBe(
      [
        'Light-dependent reactions happen in the thylakoid membrane first.',
        'The Calvin cycle then fixes carbon dioxide in the stroma afterwards.',
      ].join('\n')
    );
  });

  it('treats a 59-character line as a heading and a 60-character line as body', () => {
    const heading59 = 'H'.repeat(59);
    const line60 = 'B'.repeat(60);
    const body = 'C'.repeat(80);
    const pages: PdfPage[] = [
      { text: [heading59, line60, body].join('\n') },
    ];

    const cards = synthesizeCardsFromPdfHeadings(pages, 'Edge');

    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe(heading59);
    expect(cards[0].back).toBe([line60, body].join('\n'));
  });

  it('drops a heading immediately followed by another heading', () => {
    const pages: PdfPage[] = [
      {
        text: [
          'Chapter 4',
          'Krebs cycle',
          'A series of reactions releasing stored energy in mitochondria.',
        ].join('\n'),
      },
    ];

    const cards = synthesizeCardsFromPdfHeadings(pages, 'Bio');

    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe('Krebs cycle');
  });

  it('drops body text that appears before the first heading', () => {
    const pages: PdfPage[] = [
      {
        text: [
          'Some long preamble paragraph that belongs to no heading at all here.',
          'Glycolysis',
          'Splits glucose into two pyruvate molecules in the cytoplasm.',
        ].join('\n'),
      },
    ];

    const cards = synthesizeCardsFromPdfHeadings(pages, 'Bio');

    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe('Glycolysis');
  });

  it('carries a card across a page boundary', () => {
    const pages: PdfPage[] = [
      { text: 'Cell membrane' },
      {
        text: 'A phospholipid bilayer controlling what enters and exits the cell.',
      },
    ];

    const cards = synthesizeCardsFromPdfHeadings(pages, 'Bio');

    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe('Cell membrane');
  });

  it('tags every card with the underscored deck name', () => {
    const pages: PdfPage[] = [
      {
        text: [
          'Osmosis',
          'Movement of water across a semipermeable membrane down a gradient.',
        ].join('\n'),
      },
    ];

    const cards = synthesizeCardsFromPdfHeadings(pages, 'Cell Biology 101');

    expect(cards[0].tags).toEqual(['Cell_Biology_101']);
  });

  it('returns an empty array for blank pages', () => {
    expect(
      synthesizeCardsFromPdfHeadings([{ text: '' }, { text: '  \n ' }], 'Empty')
    ).toEqual([]);
  });

  it('returns an empty array when no line qualifies as a heading', () => {
    const longLine =
      'Every single line in this document is a long flowing paragraph well over the limit.';
    const pages: PdfPage[] = [{ text: [longLine, longLine].join('\n') }];

    expect(synthesizeCardsFromPdfHeadings(pages, 'NoHeadings')).toEqual([]);
  });
});
