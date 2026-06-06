import { buildLockedPdfWarning } from './lockedPdfWarning';

describe('buildLockedPdfWarning', () => {
  it('returns null when nothing was locked', () => {
    expect(buildLockedPdfWarning([])).toBeNull();
  });

  it('names a single locked PDF and tells the user how to unlock it', () => {
    const warning = buildLockedPdfWarning(['Biochemistry.pdf']);
    expect(warning).toBe(
      'Biochemistry.pdf is password-protected and was skipped. Unlock it in Preview or Adobe Reader, save a copy, and upload that on its own.'
    );
  });

  it('lists every locked PDF and the count when several are locked', () => {
    const warning = buildLockedPdfWarning(['Ch1.pdf', 'Ch2.pdf', 'Ch3.pdf']);
    expect(warning).toBe(
      '3 password-protected PDFs were skipped: Ch1.pdf, Ch2.pdf, Ch3.pdf. Unlock each in Preview or Adobe Reader, save a copy, and upload them on their own.'
    );
  });

  it('strips the folder path so the user sees only the filename', () => {
    const warning = buildLockedPdfWarning(['Course/Week 4/Lecture.pdf']);
    expect(warning).toBe(
      'Lecture.pdf is password-protected and was skipped. Unlock it in Preview or Adobe Reader, save a copy, and upload that on its own.'
    );
  });

  it('ignores empty filenames', () => {
    expect(buildLockedPdfWarning(['', '   '.trim()])).toBeNull();
  });
});
