import Note from './Note';

export function noteHasAnswerSide(note: Note): boolean {
  return note.back.trim().length > 0 || note.hasClozeDeletion();
}

export default noteHasAnswerSide;
