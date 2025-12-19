const express = require('express');
const { createPoll, getPolls, votePoll, closePoll, deletePoll } = require('../controllers/pollController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.route('/').get(getPolls).post(authorize('committee', 'admin'), createPoll);
router.post('/:id/vote', votePoll);
router.post('/:id/close', authorize('committee', 'admin'), closePoll);
router.delete('/:id', authorize('committee', 'admin'), deletePoll);

module.exports = router;

