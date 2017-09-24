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

if (process.env.LOGLEVEL) {
  winston.level = process.env.LOGLEVEL;
}

module.exports = winston;
