const express = require('express');
const {
  createPost,
  getPosts,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  deleteComment,
} = require('../controllers/communityController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.route('/').get(getPosts).post(createPost);
router.route('/:id').put(updatePost).delete(deletePost);
router.post('/:id/like', toggleLike);
router.post('/:id/comments', addComment);
router.delete('/:id/comments/:commentId', deleteComment);

module.exports = router;

