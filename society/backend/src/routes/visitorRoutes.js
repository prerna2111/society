const express = require('express');
const { createVisitorLog, getVisitors, updateVisitor, deleteVisitor } = require('../controllers/visitorController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.route('/').get(getVisitors).post(createVisitorLog); // All authenticated users can create visitors
router.route('/:id').put(updateVisitor).delete(deleteVisitor);

module.exports = router;

