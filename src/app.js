const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();
// const helmet = require('helmet');
// app.use(helmet());

const middlewares = require('./middlewares');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
   res.json({
      message: '🦄🌈✨👋🌎🌍🌏✨🌈🦄',
   });
});

// app.use('/api/v1', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

module.exports = app;
