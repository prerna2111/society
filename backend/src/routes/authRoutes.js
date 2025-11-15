const express = require('express');
const { register, login, getProfile, logout, bootstrapAdmin } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register); // Public registration
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getProfile);
router.post('/bootstrap', bootstrapAdmin);

module.exports = router;

