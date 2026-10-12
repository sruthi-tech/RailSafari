const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const trainRoutes = require('./trainRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const bookingRoutes = require('./bookingRoutes');

// Mount routes
router.use('/health', healthRoutes);
router.use('/trains', trainRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/bookings', bookingRoutes);

module.exports = router;
