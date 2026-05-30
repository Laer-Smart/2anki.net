import Package from '../../lib/parser/Package';
import CardOption from '../../lib/parser/Settings/CardOption';
import { UploadedFile } from '../../lib/storage/types';
import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'node:fs';
import Workspace from '../../lib/parser/WorkSpace';
import { EmptyDeckError } from '../jobs/EmptyDeckError';

export interface PackageResult {
  packages: Package[];
  warnings?: string[];
}

type ProgressMessage = { type: 'progress'; step: string };
type ResultMessage = { type: 'result'; packages: Package[]; warnings?: string[] };
type ErrorMessage = { type: 'error'; message: string; name?: string };
type WorkerMessage = ProgressMessage | ResultMessage | ErrorMessage;

class GeneratePackagesUseCase {
  execute(
    paying: boolean,
    files: UploadedFile[],
    settings: CardOption,
    workspace: Workspace,
    onProgress?: (step: string) => void,
    userId: number | null = null
  ): Promise<PackageResult> {
    return new Promise((resolve, reject) => {
      const enqueuedAt = Date.now();
      const data = { paying, files, settings, workspace, enqueuedAt, userId };
      const workerTs = path.resolve(__dirname, './worker.ts');
      const workerJs = path.resolve(__dirname, './worker.js');
      const workerPath = fs.existsSync(workerTs) ? workerTs : workerJs;
      const execArgv = workerPath.endsWith('.ts') ? ['--require', 'tsx/cjs'] : [];
      const worker = new Worker(workerPath, {
        workerData: { data },
        execArgv,
        resourceLimits: { maxOldGenerationSizeMb: 1024 },
      });

      worker.on('message', (msg: WorkerMessage) => {
        if (msg.type === 'progress') {
          onProgress?.(msg.step);
        } else if (msg.type === 'error') {
          if (msg.name === 'EmptyDeckError') {
            reject(new EmptyDeckError());
          } else {
            const e = new Error(msg.message);
            if (msg.name != null) {
              e.name = msg.name;
            }
            reject(e);
          }
        } else {
          resolve({ packages: msg.packages ?? [], warnings: msg.warnings });
        }
      });
      worker.on('error', (error) => reject(error));
    });
  }
}

export default GeneratePackagesUseCase;
