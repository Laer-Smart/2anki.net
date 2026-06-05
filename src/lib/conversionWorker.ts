import {
  runConversionInWorker,
  ConversionWorkerRequest,
} from './conversionPool';
import { runUploadGenerationInWorker } from '../usecases/uploads/worker';
import {
  UploadGenerationResult,
  UploadGenerationTask,
} from '../usecases/uploads/uploadGenerationTypes';

export default async function conversionWorker(
  request: ConversionWorkerRequest
): Promise<void> {
  await runConversionInWorker(request);
}

export async function uploadGeneration(
  task: UploadGenerationTask
): Promise<UploadGenerationResult> {
  return runUploadGenerationInWorker(task);
}
