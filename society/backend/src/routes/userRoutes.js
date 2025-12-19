const express = require('express');
const { getUsers, getUser, updateUser, deleteUser } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get users - accessible to all authenticated users (residents can view, admin/committee can manage)
router.route('/').get(getUsers);

// Admin/committee only routes
router.use(authorize('admin', 'committee'));
router.route('/:id').get(getUser).put(updateUser).delete(deleteUser);

module.exports = router;

