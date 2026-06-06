import {
  resolveMaxPythonWorkers,
  resolvePerWorkerPythonCap,
  resolveConversionWorkers,
} from './pythonWorkerBudget';

const previousMax = process.env.MAX_PYTHON_WORKERS;
const previousWorkers = process.env.CONVERSION_WORKERS;

afterEach(() => {
  if (previousMax === undefined) {
    delete process.env.MAX_PYTHON_WORKERS;
  } else {
    process.env.MAX_PYTHON_WORKERS = previousMax;
  }
  if (previousWorkers === undefined) {
    delete process.env.CONVERSION_WORKERS;
  } else {
    process.env.CONVERSION_WORKERS = previousWorkers;
  }
});

describe('resolveMaxPythonWorkers', () => {
  it('defaults to 8 when env is unset', () => {
    delete process.env.MAX_PYTHON_WORKERS;
    expect(resolveMaxPythonWorkers()).toBe(8);
  });

  it('respects a valid MAX_PYTHON_WORKERS override', () => {
    process.env.MAX_PYTHON_WORKERS = '6';
    expect(resolveMaxPythonWorkers()).toBe(6);
  });

  it('falls back to 8 when env is non-numeric or below 1', () => {
    process.env.MAX_PYTHON_WORKERS = '0';
    expect(resolveMaxPythonWorkers()).toBe(8);
    process.env.MAX_PYTHON_WORKERS = 'banana';
    expect(resolveMaxPythonWorkers()).toBe(8);
  });
});

describe('resolvePerWorkerPythonCap', () => {
  it('derives the per-conversion cap from the global budget and pool size', () => {
    delete process.env.MAX_PYTHON_WORKERS;
    delete process.env.CONVERSION_WORKERS;
    expect(resolvePerWorkerPythonCap()).toBe(2);
  });

  it('never drops below 1 even when the pool is larger than the budget', () => {
    process.env.MAX_PYTHON_WORKERS = '2';
    process.env.CONVERSION_WORKERS = '8';
    expect(resolvePerWorkerPythonCap()).toBe(1);
  });

  it('scales the per-worker cap up when the pool shrinks', () => {
    process.env.MAX_PYTHON_WORKERS = '8';
    process.env.CONVERSION_WORKERS = '2';
    expect(resolvePerWorkerPythonCap()).toBe(4);
  });
});

describe('global Python-spawn budget is bounded', () => {
  it('keeps worst-case Python concurrency at or below the budget for the defaults', () => {
    delete process.env.MAX_PYTHON_WORKERS;
    delete process.env.CONVERSION_WORKERS;
    const worstCase = resolveConversionWorkers() * resolvePerWorkerPythonCap();
    expect(worstCase).toBeLessThanOrEqual(resolveMaxPythonWorkers());
  });

  it('never exceeds the legacy worst case of 16 across a range of pool sizes', () => {
    const LEGACY_WORST_CASE = 16;
    for (const workers of [1, 2, 3, 4, 6, 8]) {
      process.env.CONVERSION_WORKERS = String(workers);
      delete process.env.MAX_PYTHON_WORKERS;
      const worstCase =
        resolveConversionWorkers() * resolvePerWorkerPythonCap();
      expect(worstCase).toBeLessThanOrEqual(LEGACY_WORST_CASE);
      expect(worstCase).toBeLessThanOrEqual(resolveMaxPythonWorkers());
    }
  });
});
