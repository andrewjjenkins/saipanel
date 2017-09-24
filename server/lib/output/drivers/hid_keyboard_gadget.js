'use strict';
const fs = require('fs');
const EventEmitter = require('events');
const log = require('../../../log');

class Keyboard {
  constructor(opts) {
    this.dev_name = opts.device;
    this.driver_name = opts.driver;
    this.fd = null;
    this.events = 0;
    this.last_key = '';
  }

  open() {
    const self = this;
    return new Promise(function (accept, reject) {
      if (self.fd) {
        return reject(new Error('File already open (' + self.dev_name + ')'));
      }

      const fd = fs.createWriteStream(self.dev_name);
      function openingErrorHandler(err) {
        return reject(err);
      }
      fd.on('error', openingErrorHandler);
      fd.on('open', function() {
        fd.removeListener('error', openingErrorHandler);
        self.fd = fd;
        log.info('%s - Opened', self.name());
        return accept(self);
      });
    });
  }

  name() { return 'USB Keyboard (' + this.dev_name + ')'; }

  attachRoutes(router, root) {
    const self = this;
    return new Promise(function (accept, reject) {
      router.get(root, function (req, res) {
        return res.json([
          'status',
        ]);
      });

      router.get(root + '/status', function (req, res) {
        return res.json(self.status());
      });
      return accept();
    });
  }

  status() {
    return {
      'events': this.events,
      'dev_name' : this.dev_name,
      'driver_name': this.driver_name,
      'last_key': this.last_key,
    };
  }
}

module.exports.create = function (opts) {
  const keyboard = new Keyboard(opts);

  return keyboard.open();
};
