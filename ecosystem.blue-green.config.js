// Blue-green variant of ecosystem.config.js. Two identical apps on two ports;
// the deploy script (scripts/deploy-blue-green.sh) starts exactly one at a time
// with `pm2 start ecosystem.blue-green.config.js --only server-<color>`.
//
// This file is NOT used by the automated deploy yet. The live workflow still
// uses the single-app ecosystem.config.js. See Documentation/deploy/blue-green.md
// for the rollout plan and the manual Apache steps this pairs with.
const base = {
  script: 'src/server.js',
  exec_mode: 'fork',
  instances: 1,
  autorestart: true,
  watch: false,
  max_restarts: 10,
  min_uptime: '60s',
  // Window for src/server.ts graceful shutdown to drain HTTP, Piscina,
  // and Knex before pm2 escalates to SIGKILL. Must stay above
  // SHUTDOWN_TIMEOUT_MS in src/lib/gracefulShutdown.ts (currently 85s) so a slow
  // large-deck conversion finishes instead of being force-killed at the swap.
  // Safe to be generous: blue-green serves users on the new color while the old
  // color drains, so this only delays reaping the retired process.
  kill_timeout: 90000,
  node_args: '--max-old-space-size=16384',
};

module.exports = {
  apps: [
    {
      ...base,
      name: 'server-blue',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        GIT_SHA: process.env.GIT_SHA,
      },
    },
    {
      ...base,
      name: 'server-green',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        GIT_SHA: process.env.GIT_SHA,
      },
    },
  ],
};
