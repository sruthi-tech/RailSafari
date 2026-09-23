const bookingService = require('../services/bookingService');

/**
 * Controller for POST /api/bookings/book
 */
async function bookTicket(req, res) {
  try {
    const { userId, scheduleId, passengerName, age, gender, seatId, quota, fare } = req.body;

    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({ success: false, error: 'Valid userId is required.' });
    }
    if (!scheduleId || isNaN(Number(scheduleId))) {
      return res.status(400).json({ success: false, error: 'Valid scheduleId is required.' });
    }
    if (!passengerName || !passengerName.trim()) {
      return res.status(400).json({ success: false, error: 'Passenger name is required.' });
    }
    if (age === undefined || age === null || isNaN(Number(age)) || Number(age) <= 0 || Number(age) > 120) {
      return res.status(400).json({ success: false, error: 'Valid passenger age between 1 and 120 is required.' });
    }
    if (!gender || !gender.trim()) {
      return res.status(400).json({ success: false, error: 'Passenger gender is required.' });
    }
    const cleanGender = gender.trim().toUpperCase();
    if (!['MALE', 'FEMALE', 'OTHER'].includes(cleanGender)) {
      return res.status(400).json({ success: false, error: 'Invalid gender. Allowed values: MALE, FEMALE, OTHER.' });
    }
    const cleanQuota = quota ? quota.trim().toUpperCase() : 'GENERAL';
    const validQuotas = ['GENERAL', 'TATKAL', 'LADIES', 'SENIOR_CITIZEN', 'PREMIUM_TATKAL'];
    if (!validQuotas.includes(cleanQuota)) {
      return res.status(400).json({ success: false, error: 'Invalid booking quota. Allowed values: GENERAL, TATKAL, LADIES, SENIOR_CITIZEN.' });
    }
    if (!seatId || isNaN(Number(seatId))) {
      return res.status(400).json({ success: false, error: 'Valid seatId is required.' });
    }
    if (fare === undefined || fare === null || isNaN(Number(fare)) || Number(fare) < 0) {
      return res.status(400).json({ success: false, error: 'Valid ticket fare is required.' });
    }

    const booking = await bookingService.bookTicket({
      userId,
      scheduleId,
      passengerName,
      age,
      gender,
      seatId,
      quota,
      fare
    });

    return res.status(201).json({
      success: true,
      message: 'Ticket booked successfully.',
      data: booking
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('❌ [Book Ticket Controller Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to book ticket due to a server error.',
      details: error.message
    });
  }
}

/**
 * Controller for GET /api/bookings/user/:userId
 */
async function getUserBookings(req, res) {
  try {
    const { userId } = req.params;

    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format. Expected a numeric user ID.' });
    }

    const bookings = await bookingService.getUserBookings(Number(userId));

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('❌ [User Bookings Controller Error]:', error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve user's bookings.",
      details: error.message
    });
  }
}

/**
 * Controller for POST /api/bookings/cancel
 */
async function cancelTicket(req, res) {
  try {
    const bookingIdParam = req.params.bookingId || req.body.bookingId;
    const { reason } = req.body;

    if (!bookingIdParam || isNaN(Number(bookingIdParam))) {
      return res.status(400).json({ success: false, error: 'Valid numeric booking ID is required.' });
    }

    const cancellation = await bookingService.cancelTicket({
      bookingId: Number(bookingIdParam),
      reason
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket cancelled successfully.',
      data: cancellation
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('❌ [Cancel Ticket Controller Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel ticket.',
      details: error.message
    });
  }
}

/**
 * Controller for GET /api/bookings/:identifier (Booking ID or PNR)
 */
async function getBookingDetails(req, res) {
  try {
    const { identifier } = req.params;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ success: false, error: 'Booking ID or PNR is required.' });
    }

    const booking = await bookingService.getBookingDetails(identifier.trim());

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: `No booking found matching '${identifier}'.`
      });
    }

    return res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('❌ [Booking Details Controller Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve booking details.',
      details: error.message
    });
  }
}

module.exports = {
  bookTicket,
  getUserBookings,
  cancelTicket,
  getBookingDetails
};
