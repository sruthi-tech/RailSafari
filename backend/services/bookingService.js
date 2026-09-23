const db = require('../config/database');

/**
 * Call Oracle stored procedure BOOK_TICKET to book a train ticket
 */
async function bookTicket({ userId, scheduleId, passengerName, age, gender, seatId, quota, fare }) {
  // Validate seat availability first
  const seatCheck = await db.execute(`
    SELECT S.SEAT_ID, S.SEAT_NUMBER, S.SEAT_STATUS, C.COACH_NUMBER, C.CLASS_TYPE
    FROM SEAT S
    JOIN COACH C ON S.COACH_ID = C.COACH_ID
    WHERE S.SEAT_ID = :seatId
  `, { seatId });

  if (!seatCheck.rows || seatCheck.rows.length === 0) {
    throw { statusCode: 404, message: `Seat ID ${seatId} does not exist.` };
  }

  const seat = seatCheck.rows[0];
  if (seat.SEAT_STATUS !== 'AVAILABLE') {
    throw { statusCode: 409, message: `Seat ${seat.COACH_NUMBER}-${seat.SEAT_NUMBER} is already booked or unavailable.` };
  }

  // Execute Oracle stored procedure BOOK_TICKET
  const procedureSql = `
    BEGIN
      BOOK_TICKET(
        :p_user_id,
        :p_schedule_id,
        :p_passenger_name,
        :p_age,
        :p_gender,
        :p_seat_id,
        :p_quota,
        :p_fare
      );
    END;
  `;

  const binds = {
    p_user_id: Number(userId),
    p_schedule_id: Number(scheduleId),
    p_passenger_name: passengerName.trim(),
    p_age: Number(age),
    p_gender: gender.trim().toUpperCase(),
    p_seat_id: Number(seatId),
    p_quota: (quota || 'GENERAL').trim().toUpperCase(),
    p_fare: Number(fare)
  };

  await db.execute(procedureSql, binds);

  // Retrieve the newly created booking details by finding max BOOKING_ID for user
  const fetchSql = `
    SELECT 
      B.BOOKING_ID,
      B.PNR,
      B.USER_ID,
      U.FULL_NAME AS USER_NAME,
      B.SCHEDULE_ID,
      T.TRAIN_NUMBER,
      T.TRAIN_NAME,
      T.TRAIN_TYPE,
      SS.STATION_NAME AS SOURCE_STATION,
      DS.STATION_NAME AS DESTINATION_STATION,
      TO_CHAR(S.JOURNEY_DATE, 'YYYY-MM-DD') AS JOURNEY_DATE,
      B.QUOTA,
      B.TOTAL_FARE,
      B.BOOKING_STATUS,
      TO_CHAR(B.BOOKING_DATE, 'YYYY-MM-DD HH24:MI:SS') AS BOOKING_DATE,
      P.PASSENGER_ID,
      P.PASSENGER_NAME,
      P.AGE,
      P.GENDER,
      ST.SEAT_NUMBER,
      C.COACH_NUMBER,
      C.CLASS_TYPE
    FROM BOOKING B
    JOIN USERS U ON B.USER_ID = U.USER_ID
    JOIN SCHEDULE S ON B.SCHEDULE_ID = S.SCHEDULE_ID
    JOIN TRAIN T ON S.TRAIN_ID = T.TRAIN_ID
    JOIN STATION SS ON S.SOURCE_STATION_ID = SS.STATION_ID
    JOIN STATION DS ON S.DESTINATION_STATION_ID = DS.STATION_ID
    LEFT JOIN PASSENGER P ON B.BOOKING_ID = P.BOOKING_ID
    LEFT JOIN SEAT ST ON P.SEAT_ID = ST.SEAT_ID
    LEFT JOIN COACH C ON ST.COACH_ID = C.COACH_ID
    WHERE B.USER_ID = :userId AND B.SCHEDULE_ID = :scheduleId
    ORDER BY B.BOOKING_ID DESC
  `;

  const bookingResult = await db.execute(fetchSql, { userId: Number(userId), scheduleId: Number(scheduleId) });
  const row = bookingResult.rows[0];

  return {
    bookingId: row.BOOKING_ID,
    pnr: row.PNR,
    userId: row.USER_ID,
    userName: row.USER_NAME,
    scheduleId: row.SCHEDULE_ID,
    trainNumber: row.TRAIN_NUMBER,
    trainName: row.TRAIN_NAME,
    trainType: row.TRAIN_TYPE,
    sourceStation: row.SOURCE_STATION,
    destinationStation: row.DESTINATION_STATION,
    journeyDate: row.JOURNEY_DATE,
    quota: row.QUOTA,
    totalFare: row.TOTAL_FARE,
    bookingStatus: row.BOOKING_STATUS,
    bookingDate: row.BOOKING_DATE,
    passenger: {
      passengerId: row.PASSENGER_ID,
      name: row.PASSENGER_NAME,
      age: row.AGE,
      gender: row.GENDER,
      coachNumber: row.COACH_NUMBER || 'N/A',
      seatNumber: row.SEAT_NUMBER || 'N/A',
      classType: row.CLASS_TYPE || 'N/A'
    }
  };
}

/**
 * API 4: View User's Bookings using USER_BOOKINGS view
 */
async function getUserBookings(userId) {
  // Check if user exists first
  const userCheck = await db.execute(`SELECT USER_ID FROM USERS WHERE USER_ID = :userId`, { userId: Number(userId) });
  if (!userCheck.rows || userCheck.rows.length === 0) {
    throw { statusCode: 404, message: `User ID ${userId} does not exist.` };
  }

  const sql = `
    SELECT 
      V.BOOKING_ID,
      V.FULL_NAME,
      V.EMAIL,
      V.PNR,
      V.TRAIN_NUMBER,
      V.TRAIN_NAME,
      SS.STATION_NAME AS SOURCE_STATION,
      DS.STATION_NAME AS DESTINATION_STATION,
      TO_CHAR(S.JOURNEY_DATE, 'YYYY-MM-DD') AS JOURNEY_DATE,
      V.QUOTA,
      V.TOTAL_FARE,
      V.BOOKING_STATUS,
      TO_CHAR(V.BOOKING_DATE, 'YYYY-MM-DD HH24:MI:SS') AS BOOKING_DATE
    FROM USER_BOOKINGS V
    JOIN BOOKING B ON V.BOOKING_ID = B.BOOKING_ID
    JOIN SCHEDULE S ON B.SCHEDULE_ID = S.SCHEDULE_ID
    JOIN STATION SS ON S.SOURCE_STATION_ID = SS.STATION_ID
    JOIN STATION DS ON S.DESTINATION_STATION_ID = DS.STATION_ID
    WHERE B.USER_ID = :userId
    ORDER BY V.BOOKING_ID DESC
  `;

  const result = await db.execute(sql, { userId: Number(userId) });

  return (result.rows || []).map(row => ({
    bookingId: row.BOOKING_ID,
    fullName: row.FULL_NAME,
    email: row.EMAIL,
    pnr: row.PNR,
    trainNumber: row.TRAIN_NUMBER,
    trainName: row.TRAIN_NAME,
    sourceStation: row.SOURCE_STATION,
    destinationStation: row.DESTINATION_STATION,
    journeyDate: row.JOURNEY_DATE,
    quota: row.QUOTA,
    totalFare: row.TOTAL_FARE,
    bookingStatus: row.BOOKING_STATUS,
    bookingDate: row.BOOKING_DATE
  }));
}

/**
 * API 5: Cancel Ticket using CANCEL_TICKET stored procedure
 */
async function cancelTicket({ bookingId, reason }) {
  // Check if booking exists
  const checkSql = `
    SELECT BOOKING_ID, BOOKING_STATUS, TOTAL_FARE, PNR
    FROM BOOKING
    WHERE BOOKING_ID = :bookingId
  `;
  const checkResult = await db.execute(checkSql, { bookingId: Number(bookingId) });

  if (!checkResult.rows || checkResult.rows.length === 0) {
    throw { statusCode: 404, message: `Booking ID ${bookingId} does not exist.` };
  }

  const booking = checkResult.rows[0];
  if (booking.BOOKING_STATUS === 'CANCELLED') {
    throw { statusCode: 400, message: `Booking PNR ${booking.PNR} is already cancelled.` };
  }

  // Execute CANCEL_TICKET stored procedure
  const cancelSql = `
    BEGIN
      CANCEL_TICKET(:p_booking_id, :p_reason);
    END;
  `;

  await db.execute(cancelSql, {
    p_booking_id: Number(bookingId),
    p_reason: reason || 'Customer Requested Cancellation'
  });

  // Retrieve cancellation & refund details
  const fetchSql = `
    SELECT 
      C.CANCELLATION_ID,
      C.BOOKING_ID,
      B.PNR,
      TO_CHAR(C.CANCELLATION_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CANCELLATION_DATE,
      C.REASON,
      C.REFUND_AMOUNT,
      B.BOOKING_STATUS,
      P.PAYMENT_METHOD,
      P.PAYMENT_STATUS
    FROM CANCELLATION C
    JOIN BOOKING B ON C.BOOKING_ID = B.BOOKING_ID
    LEFT JOIN PAYMENT P ON C.BOOKING_ID = P.BOOKING_ID AND P.PAYMENT_METHOD = 'REFUND'
    WHERE C.BOOKING_ID = :bookingId
    ORDER BY C.CANCELLATION_ID DESC
  `;

  const fetchResult = await db.execute(fetchSql, { bookingId: Number(bookingId) });
  const row = fetchResult.rows[0];

  return {
    cancellationId: row.CANCELLATION_ID,
    bookingId: row.BOOKING_ID,
    pnr: row.PNR,
    cancellationDate: row.CANCELLATION_DATE,
    reason: row.REASON,
    refundAmount: row.REFUND_AMOUNT,
    bookingStatus: row.BOOKING_STATUS,
    paymentStatus: row.PAYMENT_STATUS || 'REFUNDED'
  };
}

/**
 * API 6: Booking & Passenger Details by bookingId or PNR
 */
async function getBookingDetails(identifier) {
  let isNumeric = !isNaN(Number(identifier));
  let sql = `
    SELECT 
      B.BOOKING_ID,
      B.PNR,
      B.USER_ID,
      U.FULL_NAME AS USER_NAME,
      U.EMAIL AS USER_EMAIL,
      U.PHONE AS USER_PHONE,
      B.SCHEDULE_ID,
      T.TRAIN_NUMBER,
      T.TRAIN_NAME,
      T.TRAIN_TYPE,
      SS.STATION_CODE AS SOURCE_CODE,
      SS.STATION_NAME AS SOURCE_STATION,
      DS.STATION_CODE AS DESTINATION_CODE,
      DS.STATION_NAME AS DESTINATION_STATION,
      TO_CHAR(S.JOURNEY_DATE, 'YYYY-MM-DD') AS JOURNEY_DATE,
      B.QUOTA,
      B.TOTAL_FARE,
      B.BOOKING_STATUS,
      TO_CHAR(B.BOOKING_DATE, 'YYYY-MM-DD HH24:MI:SS') AS BOOKING_DATE
    FROM BOOKING B
    JOIN USERS U ON B.USER_ID = U.USER_ID
    JOIN SCHEDULE S ON B.SCHEDULE_ID = S.SCHEDULE_ID
    JOIN TRAIN T ON S.TRAIN_ID = T.TRAIN_ID
    JOIN STATION SS ON S.SOURCE_STATION_ID = SS.STATION_ID
    JOIN STATION DS ON S.DESTINATION_STATION_ID = DS.STATION_ID
    WHERE ${isNumeric ? 'B.BOOKING_ID = :id' : 'UPPER(B.PNR) = UPPER(:id)'}
  `;

  const binds = { id: isNumeric ? Number(identifier) : String(identifier).trim() };
  const result = await db.execute(sql, binds);

  if (!result.rows || result.rows.length === 0) {
    return null;
  }

  const booking = result.rows[0];

  // Fetch passengers associated with this booking
  const passengerSql = `
    SELECT 
      P.PASSENGER_ID,
      P.PASSENGER_NAME,
      P.AGE,
      P.GENDER,
      P.SEAT_ID,
      ST.SEAT_NUMBER,
      ST.SEAT_TYPE,
      C.COACH_NUMBER,
      C.CLASS_TYPE
    FROM PASSENGER P
    LEFT JOIN SEAT ST ON P.SEAT_ID = ST.SEAT_ID
    LEFT JOIN COACH C ON ST.COACH_ID = C.COACH_ID
    WHERE P.BOOKING_ID = :bookingId
    ORDER BY P.PASSENGER_ID ASC
  `;

  const passengerResult = await db.execute(passengerSql, { bookingId: booking.BOOKING_ID });

  const passengers = (passengerResult.rows || []).map(p => ({
    passengerId: p.PASSENGER_ID,
    name: p.PASSENGER_NAME,
    age: p.AGE,
    gender: p.GENDER,
    seatId: p.SEAT_ID,
    coachNumber: p.COACH_NUMBER || 'N/A',
    seatNumber: p.SEAT_NUMBER || 'N/A',
    seatType: p.SEAT_TYPE || 'N/A',
    classType: p.CLASS_TYPE || 'N/A'
  }));

  // Fetch cancellation info if cancelled
  let cancellation = null;
  if (booking.BOOKING_STATUS === 'CANCELLED') {
    const cancelSql = `
      SELECT CANCELLATION_ID, REASON, REFUND_AMOUNT, TO_CHAR(CANCELLATION_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CANCELLATION_DATE
      FROM CANCELLATION
      WHERE BOOKING_ID = :bookingId
    `;
    const cancelRes = await db.execute(cancelSql, { bookingId: booking.BOOKING_ID });
    if (cancelRes.rows && cancelRes.rows.length > 0) {
      const c = cancelRes.rows[0];
      cancellation = {
        cancellationId: c.CANCELLATION_ID,
        reason: c.REASON,
        refundAmount: c.REFUND_AMOUNT,
        cancellationDate: c.CANCELLATION_DATE
      };
    }
  }

  return {
    bookingId: booking.BOOKING_ID,
    pnr: booking.PNR,
    user: {
      userId: booking.USER_ID,
      name: booking.USER_NAME,
      email: booking.USER_EMAIL,
      phone: booking.USER_PHONE
    },
    train: {
      scheduleId: booking.SCHEDULE_ID,
      trainNumber: booking.TRAIN_NUMBER,
      trainName: booking.TRAIN_NAME,
      trainType: booking.TRAIN_TYPE,
      sourceStation: { code: booking.SOURCE_CODE, name: booking.SOURCE_STATION },
      destinationStation: { code: booking.DESTINATION_CODE, name: booking.DESTINATION_STATION },
      journeyDate: booking.JOURNEY_DATE
    },
    quota: booking.QUOTA,
    totalFare: booking.TOTAL_FARE,
    bookingStatus: booking.BOOKING_STATUS,
    bookingDate: booking.BOOKING_DATE,
    passengers,
    cancellation
  };
}

module.exports = {
  bookTicket,
  getUserBookings,
  cancelTicket,
  getBookingDetails
};
