'use strict';
const winston = require('winston');

winston.configure({
  transports: [
    new (winston.transports.Console)
    ({
      colorize: true,
        timestamp: true,
        humanReadableUnhandledException: true,
    }),
  ],
});

module.exports = winston;
