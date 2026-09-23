const userService = require('../services/userService');

/**
 * Controller for POST /api/users/register
 */
async function register(req, res) {
  try {
    const { fullName, phone, email, password, irctcNumber } = req.body;

    // Validation
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid email address format.' });
    }

    const user = await userService.registerUser({
      fullName,
      phone,
      email,
      password,
      irctcNumber
    });

    return res.status(201).json({
      success: true,
      message: 'User account registered successfully.',
      data: user
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('❌ [User Registration Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed due to a server error.',
      details: error.message
    });
  }
}

/**
 * Controller for POST /api/users/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required.' });
    }

    const user = await userService.loginUser({ email, password });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: user
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('❌ [User Login Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed due to a server error.',
      details: error.message
    });
  }
}

module.exports = {
  register,
  login
};
