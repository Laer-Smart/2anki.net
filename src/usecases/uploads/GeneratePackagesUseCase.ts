import Package from '../../lib/parser/Package';
import CardOption from '../../lib/parser/Settings/CardOption';
import { UploadedFile } from '../../lib/storage/types';
import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'node:fs';
import Workspace from '../../lib/parser/WorkSpace';

export interface PackageResult {
  packages: Package[];
  warnings?: string[];
}

type ProgressMessage = { type: 'progress'; step: string };
type ResultMessage = { type: 'result'; packages: Package[]; warnings?: string[] };
type ErrorMessage = { type: 'error'; message: string };
type WorkerMessage = ProgressMessage | ResultMessage | ErrorMessage;

class GeneratePackagesUseCase {
  execute(
    paying: boolean,
    files: UploadedFile[],
    settings: CardOption,
    workspace: Workspace,
    onProgress?: (step: string) => void
  ): Promise<PackageResult> {
    return new Promise((resolve, reject) => {
      const data = { paying, files, settings, workspace };
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
          reject(new Error(msg.message));
        } else {
          resolve({ packages: msg.packages ?? [], warnings: msg.warnings });
        }
      });
      worker.on('error', (error) => reject(error));
    });
  }
}

export default GeneratePackagesUseCase;
