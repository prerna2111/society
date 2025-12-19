const express = require('express');
const { initiatePayment, updatePaymentStatus, getPayments } = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.route('/').get(getPayments).post(initiatePayment);
router.route('/:id').patch(authorize('committee', 'admin'), updatePaymentStatus);

module.exports = router;

