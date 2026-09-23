const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// POST /api/bookings and POST /api/bookings/book - Book a new ticket (calls BOOK_TICKET procedure)
router.post('/', bookingController.bookTicket);
router.post('/book', bookingController.bookTicket);

// POST /api/bookings/:bookingId/cancel and POST /api/bookings/cancel - Cancel a booking (calls CANCEL_TICKET procedure)
router.post('/cancel', bookingController.cancelTicket);
router.post('/:bookingId/cancel', bookingController.cancelTicket);

// GET /api/bookings/user/:userId - View user's bookings (uses USER_BOOKINGS view)
router.get('/user/:userId', bookingController.getUserBookings);

// GET /api/bookings/:identifier - Get full booking/passenger details by booking ID or PNR
router.get('/:identifier', bookingController.getBookingDetails);

module.exports = router;
