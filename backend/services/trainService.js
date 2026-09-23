const db = require('../config/database');

/**
 * Search available trains based on source station, destination station, and/or journey date.
 * Uses AVAILABLE_TRAINS view joined with TRAIN, STATION, and TRAIN_ROUTE.
 */
async function searchTrains({ source, destination, date }) {
  let sql = `
    SELECT 
      V.SCHEDULE_ID,
      V.TRAIN_NUMBER,
      V.TRAIN_NAME,
      T.TRAIN_TYPE,
      SS.STATION_CODE AS SOURCE_STATION_CODE,
      V.SOURCE_STATION AS SOURCE_STATION_NAME,
      SS.CITY AS SOURCE_CITY,
      SS.STATE AS SOURCE_STATE,
      DS.STATION_CODE AS DESTINATION_STATION_CODE,
      V.DESTINATION_STATION AS DESTINATION_STATION_NAME,
      DS.CITY AS DESTINATION_CITY,
      DS.STATE AS DESTINATION_STATE,
      TO_CHAR(V.JOURNEY_DATE, 'YYYY-MM-DD') AS JOURNEY_DATE,
      V.STATUS,
      SR.DEPARTURE_TIME,
      DR.ARRIVAL_TIME
    FROM AVAILABLE_TRAINS V
    JOIN TRAIN T ON V.TRAIN_NUMBER = T.TRAIN_NUMBER
    JOIN STATION SS ON V.SOURCE_STATION = SS.STATION_NAME
    JOIN STATION DS ON V.DESTINATION_STATION = DS.STATION_NAME
    LEFT JOIN TRAIN_ROUTE SR ON T.TRAIN_ID = SR.TRAIN_ID AND SS.STATION_ID = SR.STATION_ID
    LEFT JOIN TRAIN_ROUTE DR ON T.TRAIN_ID = DR.TRAIN_ID AND DS.STATION_ID = DR.STATION_ID
    WHERE 1=1
  `;

  const binds = {};

  if (source && source.trim() !== '') {
    const cleanSource = source.trim().toUpperCase();
    sql += ` AND (
      UPPER(SS.STATION_CODE) = :sourceCode OR 
      UPPER(SS.STATION_NAME) LIKE :sourceName OR 
      UPPER(SS.CITY) LIKE :sourceCity
    )`;
    binds.sourceCode = cleanSource;
    binds.sourceName = `%${cleanSource}%`;
    binds.sourceCity = `%${cleanSource}%`;
  }

  if (destination && destination.trim() !== '') {
    const cleanDest = destination.trim().toUpperCase();
    sql += ` AND (
      UPPER(DS.STATION_CODE) = :destCode OR 
      UPPER(DS.STATION_NAME) LIKE :destName OR 
      UPPER(DS.CITY) LIKE :destCity
    )`;
    binds.destCode = cleanDest;
    binds.destName = `%${cleanDest}%`;
    binds.destCity = `%${cleanDest}%`;
  }

  if (date && date.trim() !== '') {
    sql += ` AND V.JOURNEY_DATE = TO_DATE(:journeyDate, 'YYYY-MM-DD')`;
    binds.journeyDate = date.trim();
  }

  sql += ` ORDER BY V.JOURNEY_DATE ASC, V.TRAIN_NUMBER ASC`;

  const result = await db.execute(sql, binds);

  const trains = (result.rows || []).map(row => ({
    scheduleId: row.SCHEDULE_ID,
    trainNumber: row.TRAIN_NUMBER,
    trainName: row.TRAIN_NAME,
    trainType: row.TRAIN_TYPE || 'EXPRESS',
    sourceStation: {
      code: row.SOURCE_STATION_CODE,
      name: row.SOURCE_STATION_NAME,
      city: row.SOURCE_CITY,
      state: row.SOURCE_STATE
    },
    destinationStation: {
      code: row.DESTINATION_STATION_CODE,
      name: row.DESTINATION_STATION_NAME,
      city: row.DESTINATION_CITY,
      state: row.DESTINATION_STATE
    },
    journeyDate: row.JOURNEY_DATE,
    status: row.STATUS,
    departureTime: row.DEPARTURE_TIME || 'N/A',
    arrivalTime: row.ARRIVAL_TIME || 'N/A'
  }));

  return trains;
}

/**
 * Fetch seat availability for a selected train schedule or train number.
 * Uses TRAIN_SEAT_AVAILABILITY view joined with SCHEDULE, TRAIN, and STATION.
 */
async function getSeatAvailability({ scheduleId, trainNumber, classType }) {
  let trainSql = `
    SELECT 
      S.SCHEDULE_ID,
      S.TRAIN_ID,
      T.TRAIN_NUMBER,
      T.TRAIN_NAME,
      T.TRAIN_TYPE,
      TO_CHAR(S.JOURNEY_DATE, 'YYYY-MM-DD') AS JOURNEY_DATE,
      SS.STATION_NAME AS SOURCE_STATION,
      DS.STATION_NAME AS DESTINATION_STATION,
      S.STATUS AS SCHEDULE_STATUS
    FROM SCHEDULE S
    JOIN TRAIN T ON S.TRAIN_ID = T.TRAIN_ID
    JOIN STATION SS ON S.SOURCE_STATION_ID = SS.STATION_ID
    JOIN STATION DS ON S.DESTINATION_STATION_ID = DS.STATION_ID
    WHERE 1=1
  `;

  const trainBinds = {};

  if (scheduleId) {
    trainSql += ` AND S.SCHEDULE_ID = :scheduleId`;
    trainBinds.scheduleId = Number(scheduleId);
  } else if (trainNumber) {
    trainSql += ` AND UPPER(T.TRAIN_NUMBER) = :trainNumber`;
    trainBinds.trainNumber = String(trainNumber).trim().toUpperCase();
  } else {
    return null;
  }

  trainSql += ` ORDER BY S.JOURNEY_DATE ASC`;

  const trainResult = await db.execute(trainSql, trainBinds);

  if (!trainResult.rows || trainResult.rows.length === 0) {
    return null;
  }

  const trainInfo = trainResult.rows[0];

  let availabilitySql = `
    SELECT 
      TRAIN_NUMBER,
      TRAIN_NAME,
      COACH_NUMBER,
      CLASS_TYPE,
      TOTAL_SEATS,
      AVAILABLE_SEATS
    FROM TRAIN_SEAT_AVAILABILITY
    WHERE UPPER(TRAIN_NUMBER) = :trainNumber
  `;

  const availBinds = { trainNumber: trainInfo.TRAIN_NUMBER };

  if (classType && classType.trim() !== '') {
    availabilitySql += ` AND UPPER(CLASS_TYPE) = :classType`;
    availBinds.classType = classType.trim().toUpperCase();
  }

  availabilitySql += ` ORDER BY COACH_NUMBER ASC`;

  const availResult = await db.execute(availabilitySql, availBinds);

  const coaches = (availResult.rows || []).map(row => ({
    coachNumber: row.COACH_NUMBER,
    classType: row.CLASS_TYPE,
    totalSeats: row.TOTAL_SEATS,
    availableSeats: row.AVAILABLE_SEATS
  }));

  const totalSeatsSum = coaches.reduce((sum, c) => sum + (c.totalSeats || 0), 0);
  const totalAvailableSeatsSum = coaches.reduce((sum, c) => sum + (c.availableSeats || 0), 0);

  return {
    scheduleId: trainInfo.SCHEDULE_ID,
    trainId: trainInfo.TRAIN_ID,
    trainNumber: trainInfo.TRAIN_NUMBER,
    trainName: trainInfo.TRAIN_NAME,
    trainType: trainInfo.TRAIN_TYPE || 'EXPRESS',
    journeyDate: trainInfo.JOURNEY_DATE,
    sourceStation: trainInfo.SOURCE_STATION,
    destinationStation: trainInfo.DESTINATION_STATION,
    scheduleStatus: trainInfo.SCHEDULE_STATUS,
    summary: {
      totalCoaches: coaches.length,
      totalSeats: totalSeatsSum,
      availableSeats: totalAvailableSeatsSum
    },
    coaches
  };
}

/**
 * Fetch all available stations for dropdown selection.
 */
async function getAllStations() {
  const sql = `
    SELECT 
      STATION_ID,
      STATION_CODE,
      STATION_NAME,
      CITY,
      STATE
    FROM STATION
    ORDER BY STATION_NAME ASC
  `;
  const result = await db.execute(sql);

  return (result.rows || []).map(row => ({
    stationId: row.STATION_ID,
    code: row.STATION_CODE,
    name: row.STATION_NAME,
    city: row.CITY,
    state: row.STATE
  }));
}

module.exports = {
  searchTrains,
  getSeatAvailability,
  getAllStations
};
