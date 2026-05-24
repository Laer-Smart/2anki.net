module.exports = {
  apps: [
    {
      name: 'server',
      script: 'src/server.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '60s',
      // Window for src/server.ts graceful shutdown to drain HTTP, Piscina,
      // and Knex before pm2 escalates to SIGKILL.
      kill_timeout: 30000,
      node_args: '--max-old-space-size=16384',
      env: {
        NODE_ENV: 'production',
        GIT_SHA: process.env.GIT_SHA,
      },
    },
  ],
};
