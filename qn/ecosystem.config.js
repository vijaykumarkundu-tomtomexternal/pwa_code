module.exports = {
  apps: [
    {
      name: 'qn-api-server',
      script: 'app.py',
      interpreter: 'D:/pwa/qn/qn_venv/Scripts/python.exe',
      cwd: 'D:/pwa/qn',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      detached: true,
      windowsHide: true,
      env: {
        NODE_ENV: 'development',
        FLASK_ENV: 'development',
        PYTHONPATH: 'D:/pwa/qn',
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8'
      },
      env_production: {
        NODE_ENV: 'production',
        FLASK_ENV: 'production',
        PYTHONPATH: 'D:/pwa/qn',
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8'
      },
      error_file: './logs/qn-api-error.log',
      out_file: './logs/qn-api-out.log',
      log_file: './logs/qn-api-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 8000,
      wait_ready: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      exp_backoff_restart_delay: 100
    },
    {
      name: "vite-react-app",
      script: "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
      args: ["run", "dev"],
      cwd: "D:/pwa/Qn-Prem",
      watch: false,
      autorestart: true,
      max_restarts: 3,          // Stop after 3 restart attempts
      min_uptime: "10s",        // Must run for 10s to be considered successful  
      restart_delay: 5000,      // Wait 5s between restarts
      env: {
        NODE_ENV: "development",
        PORT: "8800"
      },
      error_file: "./logs/react-error.log",
      out_file: "./logs/react-out.log"
    }
  ]
};
