'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const expressWinston = require('express-winston');
const log = require('./lib/log');
const router = require('./lib/router');
const input = require('./lib/input');
const output = require('./lib/output');
const evRouter = require('./lib/evrouter');


const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(expressWinston.logger({
  winstonInstance: log,
  colorize: true,
}));

var port = process.env.PORT || 8081;
app.listen(port);

router.use(app).then(function (apiRouter) {
  return Promise.all([
    input.init(apiRouter).then(function (manager) {
      log.info('Inputs initialized');
      return manager;
    }),
    output.init(apiRouter).then(function (manager) {
      log.info('Outputs initialized');
      return manager;
    }),
  ]).then(function (managers) {
    const evRouterOpts = {
      inputManager: managers[0],
      outputManager: managers[1],
      router: apiRouter,
    };
    return evRouter.init(evRouterOpts);
  });
})
.then(function (evRouter) {
  log.info('Initialization complete');
})
.catch(function (err) {
  log.error('Error initializing: ' + err);
});
