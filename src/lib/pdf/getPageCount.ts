import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export function getPageCount(pdfPath: string, credential?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const pdfinfoBin =
      process.platform === 'darwin'
        ? '/usr/local/bin/pdfinfo'
        : '/usr/bin/pdfinfo';

    const args =
      credential != null
        ? ['-upw', credential, pdfPath]
        : [pdfPath];

    const pdfinfoProcess = spawn(pdfinfoBin, args);

    let stdout = '';
    let stderr = '';
    let spawnError: Error | null = null;

    pdfinfoProcess.stdout.on('data', (data) => {
      stdout += data;
    });

    pdfinfoProcess.stderr.on('data', (data) => {
      stderr += data;
    });

    pdfinfoProcess.on('error', (err) => {
      spawnError = err;
    });

    pdfinfoProcess.on('close', async (code, signal) => {
      const pdfDir = path.dirname(pdfPath);
      const pdfBaseName = path.basename(pdfPath, path.extname(pdfPath));
      const basename = path.basename(pdfPath);

      await fs.writeFile(
        path.join(pdfDir, `${pdfBaseName}_stdout.log`),
        stdout
      );
      await fs.writeFile(
        path.join(pdfDir, `${pdfBaseName}_stderr.log`),
        stderr
      );

      if (spawnError != null) {
        reject(new Error(`pdfinfo_spawn_failed: ${spawnError.message}`));
        return;
      }

      if (code !== 0) {
        if (stderr.includes('Encrypted') || stderr.includes('password')) {
          reject(new Error('PDF_NEEDS_PASSWORD'));
          return;
        }
        const trimmed = stderr.trim();
        reject(
          new Error(
            `pdfinfo_failed code=${code ?? 'null'} signal=${signal ?? 'none'} path=${basename} stderr=${trimmed.slice(0, 200) || '<empty>'}`
          )
        );
        return;
      }

      const pageCount = parseInt(
        stdout
          .split('\n')
          .find((line) => line.startsWith('Pages:'))
          ?.split(/\s+/)[1] ?? '0'
      );

      if (!pageCount) {
        reject(new Error('Failed to get page count'));
        return;
      }

      resolve(pageCount);
    });
  });
}
