const express = require('express');
const router = express.Router();
const trainController = require('../controllers/trainController');

// GET /api/trains/search - Search available trains by source, destination, date
router.get('/search', trainController.searchTrains);

// GET /api/trains/availability - Check seat availability by schedule ID or train number
router.get('/availability', trainController.getSeatAvailability);
router.get('/availability/:scheduleId', trainController.getSeatAvailability);

// GET /api/trains/stations - Fetch list of all stations
router.get('/stations', trainController.getStations);

module.exports = router;
