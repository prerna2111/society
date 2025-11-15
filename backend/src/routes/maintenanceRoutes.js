const express = require('express');
const { createBill, getBills, getBill, updateBill, deleteBill } = require('../controllers/maintenanceController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.route('/').get(getBills);
router.route('/:id').get(getBill);
router.post('/', authorize('committee', 'admin'), createBill);
router.put('/:id', authorize('committee', 'admin'), updateBill);
router.delete('/:id', authorize('committee', 'admin'), deleteBill);

module.exports = router;

