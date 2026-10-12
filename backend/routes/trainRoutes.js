const express = require('express');
const router = express.Router();
const trainController = require('../controllers/trainController');

// GET /api/trains and GET /api/trains/search - Search available trains by source, destination, date
router.get('/', trainController.searchTrains);
router.get('/all', trainController.searchTrains);
router.get('/search', trainController.searchTrains);

// GET /api/trains/availability - Check seat availability by schedule ID or train number
router.get('/availability', trainController.getSeatAvailability);
router.get('/availability/:scheduleId', trainController.getSeatAvailability);

// GET /api/trains/stations - Fetch list of all stations
router.get('/stations', trainController.getStations);

// GET /api/trains/schedule/:scheduleId/seats - Fetch live seat layout and availability for coach
router.get('/schedule/:scheduleId/seats', trainController.getScheduleSeats);

// GET /api/trains/fare - Execute CALCULATE_FARE stored function
router.get('/fare', trainController.calculateFare);

// GET /api/trains/admin/overview - Real Oracle DB statistics and tables overview
router.get('/admin/overview', trainController.getAdminOverview);

module.exports = router;
