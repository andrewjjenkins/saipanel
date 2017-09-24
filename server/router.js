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
