const express = require('express');
const { createComplaint, getComplaints, updateComplaint, deleteComplaint } = require('../controllers/complaintController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.route('/').get(getComplaints).post(createComplaint);
router.route('/:id').put(updateComplaint).delete(deleteComplaint);

module.exports = router;

