const db = require('../config/database');

/**
 * Check backend status and Oracle DB connection
 */
async function getHealthStatus() {
  const dbStatus = await db.checkConnection();
  
  return {
    status: dbStatus.connected ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    backend: 'RailSafari Node.js API Service',
    database: dbStatus
  };
}

module.exports = {
  getHealthStatus
};
