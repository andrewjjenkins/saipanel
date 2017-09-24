'use strict';
const promisify = require('util.promisify');
const fs = require('fs');

const log = require('../../log');

class Panel {
  constructor(opts) {
    this.dev_name = opts.device;
    this.driver_name = opts.driver;
    this.fd = null;
  }

  open() {
    var self = this;
    return new Promise(function (accept, reject) {
      if (self.fd) {
        return reject(new Error('File already open (' + this.dev_name + ')'));
      }

      promisify(fs.open)(self.dev_name, 'r')
      .then(function(fd) {
        self.fd = fs.createReadStream('', { fd: fd });
        log.info('%s - Opened', self.name());
      })
      .then(function() { accept(self); }, reject);
    });
  }

  name() {
    return 'Saitek Switch Panel (' + this.dev_name + ')';
  }

  status() {
    return {
      'events' : 0,
      'dev_name' : this.dev_name,
      'driver_name': this.driver_name,
    };
  }
};

module.exports.create = function (opts) {
  const panel = new Panel(opts);

  return panel.open();
};
