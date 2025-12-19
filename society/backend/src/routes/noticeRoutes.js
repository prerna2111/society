const express = require('express');
const { createNotice, getNotices, updateNotice, deleteNotice } = require('../controllers/noticeController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, getNotices);
router.post('/', authenticate, authorize('committee', 'admin'), createNotice);
router.put('/:id', authenticate, authorize('committee', 'admin'), updateNotice);
router.delete('/:id', authenticate, authorize('committee', 'admin'), deleteNotice);

module.exports = router;

