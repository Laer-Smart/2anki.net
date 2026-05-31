import type http from 'http';
import type { Knex } from 'knex';
import { shutdownConversionPool } from './conversionPool';

// pm2 sends SIGINT then escalates to SIGKILL after kill_timeout (set to
// 30s in ecosystem.blue-green.config.js). Reserve a safety margin so process.exit
// fires before pm2's SIGKILL lands.
export const SHUTDOWN_TIMEOUT_MS = 25_000;
// The drain budget must stay just under SHUTDOWN_TIMEOUT_MS, not far below it:
// an in-flight conversion that finishes between the old 20s ceiling and the 25s
// hard exit was being force-destroyed with grace budget still on the clock.
// 2s reserve covers the trailing database.destroy() before the hard exit fires.
export const POOL_DRAIN_TIMEOUT_MS = 23_000;

let shuttingDown = false;

export function resetGracefulShutdownStateForTesting(): void {
  shuttingDown = false;
}

export async function gracefulShutdown(
  signal: string,
  server: http.Server,
  database: Knex
): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`${signal} received — draining HTTP, conversion pool, DB pool`);

  const hardExit = setTimeout(() => {
    console.error(
      `Graceful shutdown exceeded ${SHUTDOWN_TIMEOUT_MS}ms — forcing exit`
    );
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  hardExit.unref();

  server.closeIdleConnections?.();
  await new Promise<void>((resolve) => server.close(() => resolve()));

  try {
    await shutdownConversionPool({ timeoutMs: POOL_DRAIN_TIMEOUT_MS });
  } catch (err) {
    console.error('Conversion pool drain failed:', err);
  }

  try {
    await database.destroy();
  } catch (err) {
    console.error('Database pool teardown failed:', err);
  }

  clearTimeout(hardExit);
  console.info(`${signal} drain complete — exiting cleanly`);
  process.exit(0);
}
