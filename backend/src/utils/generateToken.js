const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  const payload = {
    sub: user._id,
    role: user.role,
    email: user.email,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '7d',
  });
};

module.exports = generateToken;

