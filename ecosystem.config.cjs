module.exports = {
  apps: [
    {
      name: "waai-backend",
      script: "./backend/src/app.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "waai-frontend",
      script: "./frontend/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 5173
      }
    }
  ]
};
