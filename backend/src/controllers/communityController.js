const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const CommunityPost = require('../models/CommunityPost');

const createPost = asyncHandler(async (req, res) => {
  const { content, images } = req.body;
  
  const post = await CommunityPost.create({
    content,
    images: images || [],
    createdBy: req.user._id,
    likes: [],
    comments: [],
  });
  
  await post.populate('createdBy', 'firstName lastName flatNumber');
  return successResponse(res, { post }, 201, 'Post created');
});

const getPosts = asyncHandler(async (req, res) => {
  const posts = await CommunityPost.find({})
    .populate('createdBy', 'firstName lastName flatNumber')
    .populate('likes', 'firstName lastName')
    .populate('comments.createdBy', 'firstName lastName')
    .sort({ createdAt: -1 });
  
  return successResponse(res, { posts });
});

const updatePost = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }
  
  if (post.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only edit your own posts');
  }
  
  Object.assign(post, req.body);
  await post.save();
  
  await post.populate('createdBy', 'firstName lastName flatNumber');
  await post.populate('likes', 'firstName lastName');
  
  return successResponse(res, { post }, 200, 'Post updated');
});

const deletePost = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }
  
  if (post.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only delete your own posts');
  }
  
  await post.deleteOne();
  return successResponse(res, {}, 200, 'Post deleted');
});

const toggleLike = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }
  
  const userId = req.user._id;
  const likeIndex = post.likes.findIndex(
    (likeId) => likeId.toString() === userId.toString()
  );
  
  if (likeIndex > -1) {
    post.likes.splice(likeIndex, 1);
  } else {
    post.likes.push(userId);
  }
  
  await post.save();
  await post.populate('createdBy', 'firstName lastName flatNumber');
  await post.populate('likes', 'firstName lastName');
  
  return successResponse(res, { post }, 200, 'Like toggled');
});

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const post = await CommunityPost.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }
  
  post.comments.push({
    content,
    createdBy: req.user._id,
  });
  
  await post.save();
  await post.populate('createdBy', 'firstName lastName flatNumber');
  await post.populate('likes', 'firstName lastName');
  await post.populate('comments.createdBy', 'firstName lastName');
  
  return successResponse(res, { post }, 200, 'Comment added');
});

const deleteComment = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }
  
  const comment = post.comments.id(req.params.commentId);
  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }
  
  if (comment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only delete your own comments');
  }
  
  comment.deleteOne();
  await post.save();
  
  await post.populate('createdBy', 'firstName lastName flatNumber');
  await post.populate('likes', 'firstName lastName');
  await post.populate('comments.createdBy', 'firstName lastName');
  
  return successResponse(res, { post }, 200, 'Comment deleted');
});

module.exports = {
  createPost,
  getPosts,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  deleteComment,
};

