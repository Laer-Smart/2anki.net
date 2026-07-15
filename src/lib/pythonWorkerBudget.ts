export function resolveConversionWorkers(): number {
  const raw = Number.parseInt(process.env.CONVERSION_WORKERS ?? '', 10);
  return Number.isFinite(raw) && raw >= 1 ? raw : 4;
}

export function resolveMaxPythonWorkers(): number {
  const raw = Number.parseInt(process.env.MAX_PYTHON_WORKERS ?? '', 10);
  return Number.isFinite(raw) && raw >= 1 ? raw : 8;
}

export function resolvePerWorkerPythonCap(): number {
  const budget = resolveMaxPythonWorkers();
  const pool = resolveConversionWorkers();
  return Math.max(1, Math.floor(budget / pool));
}

export const DEFAULT_CONVERSION_WORKER_RECYCLE_TASKS = 50;

export function resolveConversionWorkerRecycleTasks(): number {
  const raw = Number.parseInt(
    process.env.CONVERSION_WORKER_RECYCLE_TASKS ?? '',
    10
  );
  return Number.isFinite(raw) && raw >= 1
    ? raw
    : DEFAULT_CONVERSION_WORKER_RECYCLE_TASKS;
}
