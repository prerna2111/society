const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const Poll = require('../models/Poll');

const createPoll = asyncHandler(async (req, res) => {
  const poll = await Poll.create({
    ...req.body,
    createdBy: req.user._id,
  });
  return successResponse(res, { poll }, 201, 'Poll created');
});

const getPolls = asyncHandler(async (req, res) => {
  const polls = await Poll.find()
    .populate('createdBy', 'firstName lastName role')
    .sort({ createdAt: -1 });
  return successResponse(res, { polls });
});

const votePoll = asyncHandler(async (req, res) => {
  const { optionId } = req.body;
  const poll = await Poll.findById(req.params.id);
  if (!poll) {
    throw new ApiError(404, 'Poll not found');
  }
  if (!poll.isActive || (poll.closesAt && poll.closesAt < new Date())) {
    throw new ApiError(400, 'Poll is closed');
  }

  try {
    poll.vote(req.user._id, optionId);
    await poll.save();
  } catch (error) {
    throw new ApiError(400, error.message);
  }

  return successResponse(res, { poll }, 200, 'Vote recorded');
});

const closePoll = asyncHandler(async (req, res) => {
  const poll = await Poll.findById(req.params.id);
  if (!poll) {
    throw new ApiError(404, 'Poll not found');
  }
  if (poll.createdBy.toString() !== req.user._id.toString() && !['committee', 'admin'].includes(req.user.role)) {
    throw new ApiError(403, 'You cannot close this poll');
  }

  poll.isActive = false;
  poll.closesAt = new Date();
  await poll.save();

  return successResponse(res, { poll }, 200, 'Poll closed');
});

const deletePoll = asyncHandler(async (req, res) => {
  const poll = await Poll.findById(req.params.id);
  if (!poll) {
    throw new ApiError(404, 'Poll not found');
  }

  if (poll.createdBy.toString() !== req.user._id.toString() && !['committee', 'admin'].includes(req.user.role)) {
    throw new ApiError(403, 'You cannot delete this poll');
  }

  await poll.deleteOne();
  return successResponse(res, {}, 200, 'Poll deleted');
});

module.exports = {
  createPoll,
  getPolls,
  votePoll,
  closePoll,
  deletePoll,
};

