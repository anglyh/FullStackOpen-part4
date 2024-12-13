const config = require('./utils/config');
const express = require('express');
require('express-async-errors');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const blogsRouter = require('./controllers/blogs');
const usersRouter = require('./controllers/users');
const { unknownEndpoint, errorHandler, tokenExtractor, userExtractor } = require('./utils/middleware');
const loginRouter = require('./controllers/login');

mongoose.set('strictQuery', false);

logger.info('Connecting to', config.MONGODB_URI);

(async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    logger.info('Connected to MongoDB');

  } catch (err) {
    logger.error('Error connecting to MongoDB:', err.message);
  }
})();

app.use(cors());
app.use(express.json());
app.use(tokenExtractor);

app.use('/api/blogs', blogsRouter);
app.use('/api/users', usersRouter);
app.use('/api/login', loginRouter);

app.use(unknownEndpoint);
app.use(errorHandler);

module.exports = app;
