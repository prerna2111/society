const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const User = require('../models/User');

const getUsers = asyncHandler(async (req, res) => {
  const { role, isApproved } = req.query;
  const query = {};
  if (role) query.role = role;
  if (typeof isApproved !== 'undefined') query.isApproved = isApproved === 'true';
  
  // Residents can only see approved, active users (excluding security)
  if (['owner', 'tenant'].includes(req.user.role)) {
    query.isApproved = true;
    query.isActive = true;
    query.role = { $ne: 'security' }; // Exclude security from members page
  }
  
  const users = await User.find(query).select('-password').sort({ createdAt: -1 });
  return successResponse(res, { users });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return successResponse(res, { user });
});

const updateUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, role, isActive, isApproved } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;
  if (role) user.role = role;
  if (typeof isActive === 'boolean') user.isActive = isActive;
  if (typeof isApproved === 'boolean') user.isApproved = isApproved;

  await user.save();

  return successResponse(res, { user }, 200, 'User updated successfully');
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  await user.deleteOne();
  return successResponse(res, {}, 200, 'User deleted');
});

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};

