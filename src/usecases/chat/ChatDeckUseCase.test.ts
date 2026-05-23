import { ChatDeckUseCase, looksLikeCloze, transformBlankToCloze, type ChatDeckCard } from './ChatDeckUseCase';
import CustomExporter from '../../lib/parser/exporters/CustomExporter';

jest.mock('../../lib/parser/exporters/CustomExporter');

describe('ChatDeckUseCase.execute MCQ handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (CustomExporter as unknown as jest.Mock).mockImplementation(() => ({
      configure: jest.fn(),
      save: jest.fn().mockResolvedValue(Buffer.from('apkg')),
    }));
  });

  it('passes mcq:true with options and correctIndices to the exporter for MCQ cards', async () => {
    const useCase = new ChatDeckUseCase();
    await useCase.execute({
      deckName: 'Quiz',
      cards: [
        {
          front: 'Which enzyme?',
          back: '',
          options: ['Lipase', 'Amylase', 'Protease', 'Lactase'],
          correctIndex: 1,
          rationale: 'Amylase hydrolyses starch.',
        },
      ],
    });

    const Mock = CustomExporter as unknown as jest.Mock;
    const configure = Mock.mock.results[0].value.configure as jest.Mock;
    const deckInfo = configure.mock.calls[0][0] as Array<{
      cards: Array<{ mcq?: boolean; options?: string[]; correctIndices?: number[]; back: string }>;
    }>;
    expect(deckInfo[0].cards[0]).toMatchObject({
      mcq: true,
      options: ['Lipase', 'Amylase', 'Protease', 'Lactase'],
      correctIndices: [1],
      back: 'Amylase hydrolyses starch.',
    });
  });

  it('keeps basic shape for cards without MCQ fields', async () => {
    const useCase = new ChatDeckUseCase();
    await useCase.execute({
      deckName: 'Mix',
      cards: [{ front: 'Q', back: 'A' }],
    });
    const Mock = CustomExporter as unknown as jest.Mock;
    const configure = Mock.mock.results[0].value.configure as jest.Mock;
    const deckInfo = configure.mock.calls[0][0] as Array<{
      cards: Array<{ mcq?: boolean; back: string }>;
    }>;
    expect(deckInfo[0].cards[0].mcq).toBeUndefined();
    expect(deckInfo[0].cards[0].back).toBe('A');
  });
});

describe('ChatDeckUseCase.execute basic-and-reversed template', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (CustomExporter as unknown as jest.Mock).mockImplementation(() => ({
      configure: jest.fn(),
      save: jest.fn().mockResolvedValue(Buffer.from('apkg')),
    }));
  });

  it('duplicates cards with swapped front/back when templateSlug is basic-and-reversed', async () => {
    const useCase = new ChatDeckUseCase();
    await useCase.execute({
      deckName: 'Reversed',
      templateSlug: 'basic-and-reversed',
      cards: [{ front: 'Q', back: 'A' }],
    });
    const Mock = CustomExporter as unknown as jest.Mock;
    const configure = Mock.mock.results[0].value.configure as jest.Mock;
    const deckInfo = configure.mock.calls[0][0] as Array<{
      cards: Array<ChatDeckCard & { name: string; back: string }>;
    }>;
    expect(deckInfo[0].cards).toHaveLength(2);
    expect(deckInfo[0].cards[0]).toMatchObject({ name: 'Q', back: 'A' });
    expect(deckInfo[0].cards[1]).toMatchObject({ name: 'A', back: 'Q' });
  });

  it('does not add reversed card when back is empty', async () => {
    const useCase = new ChatDeckUseCase();
    await useCase.execute({
      deckName: 'Cloze set',
      templateSlug: 'basic-and-reversed',
      cards: [{ front: 'Capital of France is {{c1::Paris}}.', back: '' }],
    });
    const Mock = CustomExporter as unknown as jest.Mock;
    const configure = Mock.mock.results[0].value.configure as jest.Mock;
    const deckInfo = configure.mock.calls[0][0] as Array<{
      cards: Array<{ name: string }>;
    }>;
    expect(deckInfo[0].cards).toHaveLength(1);
  });

  it('does not expand when templateSlug is basic', async () => {
    const useCase = new ChatDeckUseCase();
    await useCase.execute({
      deckName: 'Basic set',
      templateSlug: 'basic',
      cards: [{ front: 'Q', back: 'A' }],
    });
    const Mock = CustomExporter as unknown as jest.Mock;
    const configure = Mock.mock.results[0].value.configure as jest.Mock;
    const deckInfo = configure.mock.calls[0][0] as Array<{
      cards: Array<{ name: string }>;
    }>;
    expect(deckInfo[0].cards).toHaveLength(1);
  });
});

describe('looksLikeCloze', () => {
  it('returns true for a single cloze marker', () => {
    expect(looksLikeCloze('Paris is the capital of {{c1::France}}')).toBe(true);
  });

  it('returns true for multi-digit cloze numbers', () => {
    expect(looksLikeCloze('{{c12::elephant}} memory')).toBe(true);
  });

  it('returns true when more than one cloze marker is present', () => {
    expect(
      looksLikeCloze('{{c1::mitochondria}} is the {{c2::powerhouse}} of the cell')
    ).toBe(true);
  });

  it('returns true when the marker is embedded in HTML', () => {
    expect(looksLikeCloze('<p>What is <b>{{c1::Paris}}</b>?</p>')).toBe(true);
  });

  it('returns false on plain Q/A text', () => {
    expect(looksLikeCloze('What is the capital of France?')).toBe(false);
  });

  it('returns false when only the opening braces are present', () => {
    expect(looksLikeCloze('Render {{ as braces}}')).toBe(false);
  });

  it('returns false when cloze marker has no digit', () => {
    expect(looksLikeCloze('{{c::Paris}} broken syntax')).toBe(false);
  });

  it('returns false on an empty string', () => {
    expect(looksLikeCloze('')).toBe(false);
  });
});

describe('transformBlankToCloze', () => {
  it('rewrites a single ___ blank with the back content as {{c1::...}}', () => {
    expect(
      transformBlankToCloze({
        front: 'The Norwegian word for hunting is ___.',
        back: 'jakt',
      })
    ).toEqual({
      front: 'The Norwegian word for hunting is {{c1::jakt}}.',
      back: '',
    });
  });

  it('only rewrites the first blank when the front has multiple', () => {
    expect(
      transformBlankToCloze({
        front: 'A ___ eats ___ for breakfast.',
        back: 'cat',
      })
    ).toEqual({
      front: 'A {{c1::cat}} eats ___ for breakfast.',
      back: '',
    });
  });

  it('leaves the card unchanged when front already uses canonical cloze syntax', () => {
    const card = {
      front: 'The capital of {{c1::France}} is Paris.',
      back: '',
    };
    expect(transformBlankToCloze(card)).toEqual(card);
  });

  it('leaves the card unchanged when there is no blank pattern in the front', () => {
    const card = { front: 'What is the capital of France?', back: 'Paris' };
    expect(transformBlankToCloze(card)).toEqual(card);
  });

  it('leaves the card unchanged when back is empty or whitespace-only', () => {
    const card = { front: 'A ___ is a furry pet.', back: '   ' };
    expect(transformBlankToCloze(card)).toEqual(card);
  });

  it('trims surrounding whitespace from the back content before substitution', () => {
    expect(
      transformBlankToCloze({
        front: 'Hjort means ___ in English.',
        back: '  deer  ',
      })
    ).toEqual({
      front: 'Hjort means {{c1::deer}} in English.',
      back: '',
    });
  });

  it('accepts 2-or-more underscores as a blank marker', () => {
    expect(
      transformBlankToCloze({
        front: 'Two underscores too: __',
        back: 'still works',
      })
    ).toEqual({
      front: 'Two underscores too: {{c1::still works}}',
      back: '',
    });
  });
});
