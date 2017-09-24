'use strict';
const fs = require('fs');
const EventEmitter = require('events');
const log = require('../../log');

function keyToCode(key) {
  const a_code = 0x04;
  const a_char = "a".charCodeAt(0), z_char = "z".charCodeAt(0);
  const key_char = key.charCodeAt(0);

  if (key.length !== 1) {
    throw new Error('Key code must be exactly one character');
  }

  if (key_char > z_char || key_char < a_char) {
    //FIXME(andrew): Support wider key ranges.
    throw new Error('Key code must be a-z');
  }

  return (key_char - a_char) + a_code;
}

class Keyboard {
  constructor(opts) {
    this.dev_name = opts.device;
    this.driver_name = opts.driver;
    this.fd = null;
    this.events = 0;
    this.last_key = '';
    this.errors = 0;
  }

  // FIXME(andrew): We could close and reopen the device here.
  handleWriteErrors(err) {
    log.warn('%s: write error %s', this.name(), err);
    this.errors++;
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
        fd.on('error', function(err) { return self.handleWriteErrors(err); });
        self.fd = fd;
        log.info('%s - Opened', self.name());
        return accept(self);
      });
    });
  }

  name() { return 'USB Keyboard (' + this.dev_name + ')'; }

  writeKey(key) {
    const self = this;
    return new Promise(function (accept, reject) {
      var code;
      try {
        code = keyToCode(key)
      } catch (err) {
        return reject(err);
      }

      // We write two 8-byte reports.
      // The first is the keypress.  The second is no-keys (8 null bytes), so
      // that the host doesn't think the key is being held down.
      // They have to land in two different write() syscalls apparently.
      // FIXME(andrew): If that's true, we probably have to change to
      // fs.writeSync() or run the risk that sometimes node will buffer.
      const hidReport = Buffer.alloc(8, 0);
      hidReport[2] = code;

      log.debug('%s: Writing %d bytes (%s)', self.name(), hidReport.length,
        hidReport.toString('hex'));
      self.fd.write(hidReport);
      self.events++;
      self.last_key = key;

      hidReport.fill(0);
      log.debug('%s: Writing %d bytes (%s)', self.name(), hidReport.length,
        hidReport.toString('hex'));
      self.fd.write(hidReport);
      return accept();
    });
  }

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
      'errors': this.errors,
    };
  }
}

module.exports.create = function (opts) {
  const keyboard = new Keyboard(opts);

  return keyboard.open();
};
