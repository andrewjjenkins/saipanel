'use strict';
const express = require('express');

const topRouter = express.Router();
const router = express.Router();

topRouter.use('/api/v1', router);

module.exports.use = function(app) {
  return new Promise(function (accept, reject) {
    app.use('/', topRouter);
    return accept(router);
  });
};


router.use(function (req, res, next) {
  res.header('Cache-control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  return next();
});

// FIXME(andrew): Load a UI instead?
topRouter.get('/', function (req, res) {
  return res.redirect('/api/v1');
});

// FIXME(andrew): Should this be dynamic?
router.get('/', function (req, res) {
  return res.json([
    'inputs',
  ]);
});
