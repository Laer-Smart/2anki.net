import { execSync } from 'child_process';
import { getPageCount } from './getPageCount';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const hasPdfinfo = (() => {
  try {
    execSync('pdfinfo -v 2>&1', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
})();

const itIfPdfinfo = hasPdfinfo ? it : it.skip;

describe('getPageCount', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'getPageCount-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  itIfPdfinfo(
    'rejects with pdfinfo_failed message when given a non-PDF file',
    async () => {
      const textFile = path.join(tmpDir, 'not-a-pdf.txt');
      await fs.writeFile(textFile, 'this is plain text, not a PDF');

      await expect(getPageCount(textFile)).rejects.toMatchObject({
        message: expect.stringMatching(/^pdfinfo_failed code=/),
      });
    }
  );

  itIfPdfinfo(
    'rejects with pdfinfo_failed message containing stderr text when given a non-PDF file',
    async () => {
      const textFile = path.join(tmpDir, 'not-a-pdf.txt');
      await fs.writeFile(textFile, 'this is plain text, not a PDF');

      let caught: Error | null = null;
      try {
        await getPageCount(textFile);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).not.toBeNull();
      expect(caught!.message).toMatch(/^pdfinfo_failed code=/);
      expect(caught!.message).toContain('path=not-a-pdf.txt');
    }
  );
});
