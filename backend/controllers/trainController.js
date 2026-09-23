const trainService = require('../services/trainService');

/**
 * Controller for GET /api/trains/search
 * Query parameters: source, destination, date (YYYY-MM-DD)
 */
async function searchTrains(req, res) {
  try {
    const { source, destination, date } = req.query;

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Expected YYYY-MM-DD (e.g., 2026-09-24).'
      });
    }

    const trains = await trainService.searchTrains({ source, destination, date });

    return res.status(200).json({
      success: true,
      count: trains.length,
      filtersApplied: {
        source: source || null,
        destination: destination || null,
        date: date || null
      },
      data: trains
    });
  } catch (error) {
    console.error('❌ [Train Search Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search trains. Please try again later.',
      details: error.message
    });
  }
}

/**
 * Controller for GET /api/trains/availability and GET /api/trains/availability/:scheduleId
 */
async function getSeatAvailability(req, res) {
  try {
    const scheduleIdParam = req.params.scheduleId || req.query.scheduleId;
    const trainNumberParam = req.query.trainNumber;
    const classTypeParam = req.query.classType;

    if (!scheduleIdParam && !trainNumberParam) {
      return res.status(400).json({
        success: false,
        error: 'Please specify a schedule ID (e.g., /api/trains/availability/1) or trainNumber parameter.'
      });
    }

    if (scheduleIdParam && isNaN(Number(scheduleIdParam))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid schedule ID format. Expected a numeric ID.'
      });
    }

    const availability = await trainService.getSeatAvailability({
      scheduleId: scheduleIdParam ? Number(scheduleIdParam) : null,
      trainNumber: trainNumberParam,
      classType: classTypeParam
    });

    if (!availability) {
      return res.status(404).json({
        success: false,
        error: `No train schedule found matching ${scheduleIdParam ? `Schedule ID '${scheduleIdParam}'` : `Train Number '${trainNumberParam}'`}.`
      });
    }

    return res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('❌ [Seat Availability Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve seat availability.',
      details: error.message
    });
  }
}

/**
 * Controller for GET /api/trains/stations
 */
async function getStations(req, res) {
  try {
    const stations = await trainService.getAllStations();
    return res.status(200).json({
      success: true,
      count: stations.length,
      data: stations
    });
  } catch (error) {
    console.error('❌ [Get Stations Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve stations.',
      details: error.message
    });
  }
}

module.exports = {
  searchTrains,
  getSeatAvailability,
  getStations
};
