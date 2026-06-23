module.exports = {
  apps: [
    {
      name: "tcall",
      script: "tsx",
      args: "server.ts",
      cwd: "/var/www/tcall",
      env: {
        NODE_ENV: "production",
        PORT: 3010,
        HOSTNAME: "0.0.0.0",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      error_file: "/var/log/tcall/error.log",
      out_file: "/var/log/tcall/out.log",
      merge_logs: true,
    },
  ],
};
