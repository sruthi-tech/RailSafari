const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/database');
const apiRoutes = require('./routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'RailSafari Backend API',
    version: '1.0.0',
    description: 'Database-Driven Train Ticket Reservation & Journey Management System API',
    healthEndpoint: '/api/health'
  });
});

// API Routes
app.use('/api', apiRoutes);

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ [Server Error]:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

let server;

// Start Server and Initialize Database Pool
async function startServer() {
  try {
    // Initialize Database Pool
    try {
      await db.initializeDatabase();
    } catch (dbErr) {
      console.warn('⚠️  Backend starting without active DB connection pool (DB password may be missing in .env or DB service offline).');
    }

    server = app.listen(PORT, () => {
      console.log(`🚀 [RailSafari Backend]: Server running on http://localhost:${PORT}`);
      console.log(`🔍 [Health Endpoint]: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\nRECEIVED ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('HTTP Server closed.');
      await db.closePool();
      process.exit(0);
    });
  } else {
    await db.closePool();
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();
