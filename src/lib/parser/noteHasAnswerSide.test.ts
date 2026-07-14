import Note from './Note';
import { noteHasAnswerSide } from './noteHasAnswerSide';

describe('noteHasAnswerSide', () => {
  it('is false for a front-only card with an empty back', () => {
    expect(noteHasAnswerSide(new Note('The mitochondria', ''))).toBe(false);
  });

  it('is false when the back is only whitespace', () => {
    expect(noteHasAnswerSide(new Note('The mitochondria', '   \n'))).toBe(
      false
    );
  });

  it('is true when the back has content', () => {
    expect(noteHasAnswerSide(new Note('Capital of France', 'Paris'))).toBe(
      true
    );
  });

  it('is true when the front carries a cloze deletion', () => {
    expect(
      noteHasAnswerSide(
        new Note('The {{c1::mitochondria}} is the powerhouse', '')
      )
    ).toBe(true);
  });

  it('is true when the back carries a cloze deletion', () => {
    const note = new Note('Prompt', 'Answer is {{c1::hidden}}');
    expect(noteHasAnswerSide(note)).toBe(true);
  });
});
