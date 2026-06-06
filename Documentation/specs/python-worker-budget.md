# Spec: One Python-worker budget

Issue: #2428 (follow-up from #2418, #2415)

## Problem

Two independent concurrency caps multiply into the real Python-process ceiling:

- `CONVERSION_WORKERS` (default 4) — Piscina pool size for concurrent Notion conversions (`src/lib/conversionPool.ts`).
- `UPLOAD_BUILD_CONCURRENCY` (default 4) — concurrent Python spawns *within* one conversion (`src/usecases/uploads/getPackagesFromZip.ts`).

Worst case is the product: 4 × 4 = **16 concurrent Python processes**. The ~50 MB RSS-per-Python budget that justified capping at 4 (#2415) assumed one conversion at a time. This is a known scaling foot-gun on the path to 300K users — two operators reasoning about two knobs cannot predict the box's true memory ceiling.

## Proposal

Collapse to a single global budget: `MAX_PYTHON_WORKERS` (default 8), enforced by **one shared `p-limit` instance** that gates every Python spawn regardless of which conversion triggered it. Both the pool and the per-conversion fan-out draw from the same limiter, so the global cap holds no matter how the work is distributed.

Keep `CONVERSION_WORKERS` as the Piscina pool-thread count (it controls JS-side conversion parallelism, a separate concern from Python RSS). Deprecate `UPLOAD_BUILD_CONCURRENCY` — its job is subsumed by the shared limiter. Default 8 ≈ today's intended single-conversion ceiling, not the accidental 16.

The shared limiter lives in a small module (`src/lib/pythonWorkerLimit.ts`) exporting a singleton `pLimit(resolveMaxPythonWorkers())`. The Piscina worker spawns Python inside the worker thread, so the limiter must live in a place both the worker-thread spawn path and the in-process `getPackagesFromZip` path can import. Confirm during implementation that the worker thread shares the limiter instance with the main thread — **it does not** (separate module graph per thread). If they cannot share, fall back to per-worker `floor(MAX_PYTHON_WORKERS / CONVERSION_WORKERS)` so the product still equals the budget.

## Scope

- New `src/lib/pythonWorkerLimit.ts`: `resolveMaxPythonWorkers()` + singleton limiter.
- `getPackagesFromZip.ts`: replace `resolveBuildConcurrency` / local `pLimit(cap)` with the shared limiter.
- `conversionPool.ts` / `conversionWorker.ts`: route the Python spawn through the budget.
- `src/env.example`: document `MAX_PYTHON_WORKERS` (default, what it caps), mark `UPLOAD_BUILD_CONCURRENCY` removed.
- Tests: budget resolution (valid / invalid / unset → 8), and a generated-concurrency assertion that no more than N spawns run at once.

## Explicitly NOT in scope

- Durable job queue / out-of-process worker fleet — separate, larger effort. The single budget is the stopgap that makes the in-request path safe until then.
- Memory-pressure-aware autoscaling of the budget. Static cap first; measure before adapting.
- Touching `CONVERSION_WORKERS` semantics or default — it stays the JS pool size.

## Touch points

- `src/lib/conversionPool.ts`, `src/lib/conversionWorker.ts` (worker layer)
- `src/usecases/uploads/getPackagesFromZip.ts` (use-case layer)
- `src/lib/pythonWorkerLimit.ts` (new)
- `src/env.example`

## Risks / Rails

- **Perf / OOM (primary risk).** This change directly controls the box's worst-case Python RSS. Picking the default too high reintroduces the OOM risk; too low throttles throughput. Validate 8 against current prod RSS-per-Python before merge; the number is reversible via env, the architecture is not.
- **Cross-thread limiter sharing.** A `p-limit` singleton imported by a Piscina worker thread is *not* shared with the main thread — each thread has its own module instance. If the spawn happens inside the worker, the per-worker fallback (budget / pool size) is the correct shape; verify empirically, do not assume.
- No auth / payments / migration surface. Pure concurrency refactor.
- Behavior-changing env defaults: per code-quality rules, the unset default must be the safe value (8), tested explicitly.

## Acceptance criteria

- A single env var (`MAX_PYTHON_WORKERS`) determines the global Python-spawn ceiling; no multiplication of two caps can exceed it.
- Unset / invalid `MAX_PYTHON_WORKERS` resolves to 8; a valid value overrides.
- `UPLOAD_BUILD_CONCURRENCY` no longer affects behavior and is documented as removed.
- A test asserts concurrent Python spawns never exceed the resolved budget under a multi-conversion load.
- `/check` green; no change to conversion output, only to spawn pacing.
