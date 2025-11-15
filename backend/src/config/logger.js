const morgan = require('morgan');

const requestLogger = () => {
  const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
  return morgan(format);
};

module.exports = requestLogger;

