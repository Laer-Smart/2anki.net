import {
  runConversionInWorker,
  ConversionWorkerRequest,
} from './conversionPool';

export default async function conversionWorker(
  request: ConversionWorkerRequest
): Promise<void> {
  await runConversionInWorker(request);
}
