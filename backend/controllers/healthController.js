const healthService = require('../services/healthService');

/**
 * Controller for GET /api/health
 */
async function getHealth(req, res) {
  try {
    const health = await healthService.getHealthStatus();
    const statusCode = health.database.connected ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to retrieve system health status',
      error: error.message
    });
  }
}

module.exports = {
  getHealth
};
