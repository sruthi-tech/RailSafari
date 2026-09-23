-- ============================================================
-- RailSafari Database Schema - Triggers Definition
-- Database: Oracle Database
-- ============================================================

-- 1. TRG_BOOK_SEAT Trigger
CREATE OR REPLACE TRIGGER TRG_BOOK_SEAT
AFTER INSERT ON PASSENGER
FOR EACH ROW
WHEN (NEW.SEAT_ID IS NOT NULL)
BEGIN
    UPDATE SEAT
    SET SEAT_STATUS = 'BOOKED'
    WHERE SEAT_ID = :NEW.SEAT_ID;
END;
/

-- 2. TRG_FREE_SEAT Trigger
CREATE OR REPLACE TRIGGER TRG_FREE_SEAT
AFTER DELETE ON PASSENGER
FOR EACH ROW
WHEN (OLD.SEAT_ID IS NOT NULL)
BEGIN
    UPDATE SEAT
    SET SEAT_STATUS = 'AVAILABLE'
    WHERE SEAT_ID = :OLD.SEAT_ID;
END;
/
