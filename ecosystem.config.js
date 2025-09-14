module.exports = {
  apps: [
    {
      name: 'win5x-backend',
      script: 'packages/backend/dist/server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    }
  ]
};
