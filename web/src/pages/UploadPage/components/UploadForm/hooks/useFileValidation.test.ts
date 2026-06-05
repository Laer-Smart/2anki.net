import { describe, it, expect } from 'vitest';
import { detectUploadIssues } from './useFileValidation';

function fakeFile(name: string): File {
  return new File([''], name);
}

describe('detectUploadIssues', () => {
  it('returns null for a zip file', () => {
    expect(detectUploadIssues([fakeFile('export.zip')])).toBeNull();
  });

  it('returns null for an empty file list', () => {
    expect(detectUploadIssues([])).toBeNull();
  });

  it('returns error for a single markdown file', () => {
    const result = detectUploadIssues([fakeFile('notes.md')]);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('error');
    expect(result!.title).toContain('Markdown');
  });

  it('returns error for multiple markdown files', () => {
    const result = detectUploadIssues([
      fakeFile('page1.md'),
      fakeFile('page2.md'),
    ]);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('error');
  });

  it('is case-insensitive for markdown detection', () => {
    const result = detectUploadIssues([fakeFile('NOTES.MD')]);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('error');
  });

  it('returns warning for a single html file', () => {
    const result = detectUploadIssues([fakeFile('page.html')]);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('warning');
    expect(result!.title.toLowerCase()).toContain('images');
  });

  it('returns warning for multiple html files', () => {
    const result = detectUploadIssues([
      fakeFile('page1.html'),
      fakeFile('page2.html'),
    ]);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('warning');
    expect(result!.title).toContain('HTML');
  });

  it('returns null for csv files', () => {
    expect(detectUploadIssues([fakeFile('data.csv')])).toBeNull();
  });

  it('returns info for a single pdf file', () => {
    const result = detectUploadIssues([fakeFile('slides.pdf')]);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('info');
    expect(result!.title).toContain('pair');
  });

  it('returns info for multiple pdf files', () => {
    const result = detectUploadIssues([
      fakeFile('chapter1.pdf'),
      fakeFile('chapter2.pdf'),
    ]);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('info');
  });

  it('is case-insensitive for pdf detection', () => {
    const result = detectUploadIssues([fakeFile('NOTES.PDF')]);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('info');
  });

  it('returns null for xlsx files', () => {
    expect(detectUploadIssues([fakeFile('sheet.xlsx')])).toBeNull();
  });

  it('returns null for mixed zip and html', () => {
    expect(
      detectUploadIssues([fakeFile('export.zip'), fakeFile('extra.html')])
    ).toBeNull();
  });

  it('provides a continue label for each state', () => {
    const md = detectUploadIssues([fakeFile('n.md')]);
    expect(md!.continueLabel.length).toBeGreaterThan(0);

    const pdf = detectUploadIssues([fakeFile('n.pdf')]);
    expect(pdf!.continueLabel.length).toBeGreaterThan(0);

    const html = detectUploadIssues([fakeFile('n.html')]);
    expect(html!.continueLabel.length).toBeGreaterThan(0);

    const safari = detectUploadIssues([fakeFile('a.html'), fakeFile('b.html')]);
    expect(safari!.continueLabel.length).toBeGreaterThan(0);
  });
});
