'use strict';
const fs = require('fs');
const EventEmitter = require('events');
const promisify = require('util.promisify');

const log = require('../../log');

const KEYPRESS_PACKET_SIZE = 3;
const KEYPRESSES = {
  'SWITCHKEY_MASTER_BAT' : 0x1,
  'SWITCHKEY_MASTER_ALT' : 0x2,
  'SWITCHKEY_AVIONICS_MASTER' : 0x4,
};

class Panel extends EventEmitter {
  constructor(opts) {
    super();
    this.dev_name = opts.device;
    this.driver_name = opts.driver;
    this.fd = null;
    this.buf = new Buffer(KEYPRESS_PACKET_SIZE);
    this.cur = 0;
    this.last_key = 0;
    this.events = 0;
  }

  open() {
    const self = this;
    return new Promise(function (accept, reject) {
      if (self.fd) {
        return reject(new Error('File already open (' + self.dev_name + ')'));
      }

      promisify(fs.open)(self.dev_name, 'r')
      .then(function(fd) {
        self.fd = fs.createReadStream('', { fd: fd });
        log.info('%s - Opened', self.name());
        self.fd.on('data', function(data) { self.ondata(data); });
      })
      .then(function() { accept(self); }, reject);
    });
  }

  ondata(data) {
    var datacur = 0;
    while (datacur < data.length) {
      const data_left = data.length - datacur;
      const data_for_this_buf = (data_left % KEYPRESS_PACKET_SIZE) - this.cur;
      for (var i = 0; i < data_for_this_buf; i++) {
        this.buf[this.cur + i] = data[datacur + i];
      }
      this.cur += i;
      datacur += i;
      if (this.cur == KEYPRESS_PACKET_SIZE) {
        onpacket();
      }
    }
  }

  onpacket() {
    const self = this;
    if (this.cur != KEYPRESS_PACKET_SIZE) {
      log.error('onpacket() called with an incomplete packet (%d), skipping',
        this.cur);
      return;
    }

    // Total input is < 4 bytes: read into a UInt so bit ops are easy
    const newKey = this.buf.readUint32LE(0);
    this.cur = 0;

    const xorBits = this.last_key ^ newKey;
    Object.keys(KEYPRESSES).forEach(function(keypress) {
      const bit = KEYPRESSES[keypress];
      if (bit & xorBits) {
        const eventName = keypress + (bit & newKey ? '_ON' : '_OFF');
        log.debug('%s detected keypress %s', this.name(), eventName);

        process.nextTick(function () { self.emit(eventName); });
      }
    });
  }

  name() {
    return 'Saitek Switch Panel (' + this.dev_name + ')';
  }

  status() {
    return {
      'events' : this.events,
      'dev_name' : this.dev_name,
      'driver_name': this.driver_name,
      'cur': this.cur,
      'last_key': this.last_key,
    };
  }
};

module.exports.create = function (opts) {
  const panel = new Panel(opts);

  return panel.open();
};
