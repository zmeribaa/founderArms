const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error(err);

  if (err.name === 'ValidationError') {
    const message = Object.values(err.details).map(val => val.message);
    error = {
      statusCode: 400,
      message: message.join(', ')
    };
  }

  if (err.code === '23505') {
    error = {
      statusCode: 400,
      message: 'Duplicate field value entered'
    };
  }

  if (err.code === '23503') {
    error = {
      statusCode: 400,
      message: 'Foreign key constraint violation'
    };
  }

  if (err.name === 'JsonWebTokenError') {
    error = {
      statusCode: 401,
      message: 'Invalid token'
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      statusCode: 401,
      message: 'Token expired'
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler; 