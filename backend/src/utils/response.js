const successResponse = (res, data = {}, statusCode = 200, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

module.exports = {
  successResponse,
};

