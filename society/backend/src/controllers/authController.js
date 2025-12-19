const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');
const { successResponse } = require('../utils/response');
const User = require('../models/User');

const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, flatNumber, phone, role, gateNumber } = req.body;

  // Validate role
  if (!['owner', 'tenant', 'security'].includes(role)) {
    throw new ApiError(400, 'Invalid role. Must be owner, tenant, or security');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'User already exists with this email');
  }

  const userData = {
    firstName,
    lastName,
    email,
    password,
    phone,
    role,
    isApproved: false, // New users need approval
    isActive: true,
  };

  if (role === 'security') {
    userData.flatNumber = gateNumber || flatNumber; // Use gateNumber for security
    userData.gateNumber = gateNumber || flatNumber;
  } else {
    userData.flatNumber = flatNumber;
  }

  const user = await User.create(userData);

  return successResponse(
    res,
    {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        flatNumber: user.flatNumber,
      },
    },
    201,
    'User registered successfully. Please wait for admin approval.',
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check if user is approved (admin users are auto-approved)
  if (!user.isApproved && user.role !== 'admin') {
    throw new ApiError(403, 'Your account is pending approval. Please wait for admin approval.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const safeUser = {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    flatNumber: user.flatNumber,
    phone: user.phone,
    lastLoginAt: user.lastLoginAt,
  };

  return successResponse(res, { token, user: safeUser }, 200, 'Login successful');
});

const getProfile = asyncHandler(async (req, res) => {
  return successResponse(res, { user: req.user }, 200, 'Profile fetched');
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  return successResponse(res, {}, 200, 'Logged out');
});

const bootstrapAdmin = asyncHandler(async (req, res) => {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    throw new ApiError(403, 'Admin bootstrap not allowed after initial setup');
  }

  const { firstName, lastName, email, password, flatNumber, phone } = req.body;
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    flatNumber,
    phone,
    role: 'admin',
    isApproved: true, // Admin is auto-approved
  });

  return successResponse(
    res,
    {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    },
    201,
    'Admin user created. Please login to continue.',
  );
});

module.exports = {
  register,
  login,
  getProfile,
  logout,
  bootstrapAdmin,
};

