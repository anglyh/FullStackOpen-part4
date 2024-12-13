const logger = require('../utils/logger');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { SECRET } = require('./config');

const requestLogger = (req, res, next) => {
  logger.info('Method:', req.method);
  logger.info('Path:', req.path);
  logger.info('Body:', req.body);
  logger.info('---');
  next();
};

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {
  logger.info('--------------------------------------------------')
  logger.error('Error message', error.message);
  logger.error('Error name', error.name);
  logger.error('Error code', error.code);

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' });
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (error.name === 'MongoServerError' && error.message.includes('E11000 duplicate key error')) {
    return response.status(400).json({ error: 'expected `username` to be unique' });
  } else if (error.name === 'JsonWebTokenError') {
    return response.status(401).json({ error: 'token invalid' });
  } else if (error.name === 'TokenExpiredError') {
    return response.status(401).json({ error: 'token expired' });
  }

  next(error);
}

const tokenExtractor = (request, response, next) => {
  const authorization = request.get('authorization');
  
  if (authorization && authorization.startsWith('Bearer ')) {
    request.token = authorization.replace('Bearer ', '');
  } else {
    request.token = null;
  }

  next();
}

const userExtractor = async (request, response, next) => {
  const decodedToken = jwt.verify(request.token, SECRET);
  logger.info('request user token in userExtractor', decodedToken);
  const user = await User.findById(decodedToken.id);

  if (!user) {
    return response.status(404).json({ error: 'user not found' })
  }

  request.user = user;
  next();
}

module.exports = { 
  requestLogger,
  unknownEndpoint,
  errorHandler,
  tokenExtractor,
  userExtractor
}
