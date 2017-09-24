'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const log = require('./log');
const router = require('./router');
const inputs = require('./lib/inputs');


const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var port = process.env.PORT || 8081;
app.listen(port);

router.use(app).then(function (apiRouter) {
  return inputs.init(apiRouter);
})
.then(function () {
  log.info('Inputs initialized');
})
.catch(function (err) {
  log.error('Error initializing: ' + err);
});
