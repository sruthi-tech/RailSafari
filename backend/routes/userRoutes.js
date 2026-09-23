const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST /api/users/register - Register new user account
router.post('/register', userController.register);

// POST /api/users/login - User login authentication
router.post('/login', userController.login);

module.exports = router;
