const trainService = require('../services/trainService');

/**
 * Controller for GET /api/trains/search
 * Query parameters: source, destination, date (YYYY-MM-DD)
 */
async function searchTrains(req, res) {
  try {
    const source = req.query.source || req.query.from || req.query.fromStation || req.query.origin || req.query.src || '';
    const destination = req.query.destination || req.query.to || req.query.toStation || req.query.dest || '';
    let date = req.query.date || req.query.journeyDate || req.query.travelDate || '';

    // Normalize date format if provided as ISO string or timestamp
    if (date && typeof date === 'string') {
      date = date.trim();
      if (date.includes('T')) {
        date = date.split('T')[0];
      }
      // If formatted as DD-MM-YYYY, convert to YYYY-MM-DD
      if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        const parts = date.split('-');
        date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const parts = date.split('/');
        date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      // If date still doesn't match YYYY-MM-DD, ignore date filter rather than breaking
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        date = '';
      }
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
      data: trains,
      trains: trains
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

/**
 * Controller for GET /api/trains/schedule/:scheduleId/seats
 */
async function getScheduleSeats(req, res) {
  try {
    const { scheduleId } = req.params;
    if (!scheduleId || isNaN(Number(scheduleId))) {
      return res.status(400).json({ success: false, error: 'Valid scheduleId is required.' });
    }
    const seats = await trainService.getScheduleSeats(Number(scheduleId));
    return res.status(200).json({
      success: true,
      count: seats.length,
      data: seats
    });
  } catch (error) {
    console.error('❌ [Schedule Seats Error]:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve seats.', details: error.message });
  }
}

/**
 * Controller for GET /api/trains/fare
 */
async function calculateFare(req, res) {
  try {
    const { distance, classType, passengers } = req.query;
    const fare = await trainService.calculateFare({ distance, classType, passengers });
    return res.status(200).json({
      success: true,
      fare,
      data: { fare }
    });
  } catch (error) {
    console.error('❌ [Calculate Fare Error]:', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate fare.', details: error.message });
  }
}

/**
 * Controller for GET /api/trains/admin/overview
 */
async function getAdminOverview(req, res) {
  try {
    const overview = await trainService.getAdminOverview();
    return res.status(200).json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('❌ [Admin Overview Error]:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve admin overview.', details: error.message });
  }
}

module.exports = {
  searchTrains,
  getSeatAvailability,
  getStations,
  getScheduleSeats,
  calculateFare,
  getAdminOverview
};
