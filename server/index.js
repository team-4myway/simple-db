const cluster = require('cluster');
const os = require('os');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const authMiddleware = require('./middleware/auth');
require('dotenv').config();

const numCPUs = Math.min(os.cpus().length, 4); // Cap at 4 for dev
const PORT = process.env.PORT || 5000;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    // Optional: Restart worker
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  const app = express();

  app.use(cors({
    origin: ['http://idal.cc', 'http://idal.cc:5000', 'http://idal.cc:4173', 'http://localhost:5173', 'http://localhost:4173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json());

  // Initialize DB
  initDB().then(() => {
    
    // Routes
    app.use('/auth', authRoutes);
    app.use('/api/files', authMiddleware, fileRoutes);

    // Serve static files (optional, if we want to serve frontend from here later)
    // app.use(express.static(path.join(__dirname, '../client/dist')));

    app.listen(PORT, () => {
      console.log(`Worker ${process.pid} started on port ${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to init DB in worker', err);
    process.exit(1);
  });
}
