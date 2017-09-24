'use strict';
const fs = require('fs');
const net = require('net');
const EventEmitter = require('events');
const promisify = require('util.promisify');

const log = require('../../log');

const KEYPRESS_PACKET_SIZE = 3;
const KEYPRESSES = {
  'SWITCHKEY_MASTER_BAT' : 0x1,
  'SWITCHKEY_MASTER_ALT' : 0x2,
  'SWITCHKEY_AVIONICS_MASTER' : 0x4,
  'SWITCHKEY_FUELPUMP' : 0x8,
  'SWITCHKEY_DEICE' : 0x10,
  'SWITCHKEY_PITOTHEAT' : 0x20,
  'SWITCHKEY_COWL' : 0x40,
  'SWITCHKEY_LIGHTS_PANEL' : 0x80,
  'SWITCHKEY_LIGHTS_BEACON' : 0x100,
  'SWITCHKEY_LIGHTS_NAV' : 0x200,
  'SWITCHKEY_LIGHTS_STROBE' : 0x400,
  'SWITCHKEY_LIGHTS_TAXI' : 0x800,
  'SWITCHKEY_LIGHTS_LANDING' : 0x1000,
};

function min(x, y) { return x < y ? x : y; }
function max(x, y) { return x < y ? y : x; }

class Panel extends EventEmitter {
  constructor(opts) {
    super();
    this.dev_name = opts.device;
    this.driver_name = opts.driver;
    this.fd = null;
    this.buf = Buffer.alloc(KEYPRESS_PACKET_SIZE);
    this.cur = 0;
    this.last_key = 0;
    this.events = 0;
    this.keys = {};
    Object.keys(KEYPRESSES).forEach(function(key) {
      this.keys[key] = {
        'events': 0,
        'last': '',
        'position': 0,
      };
    }, this);
  }

  open() {
    const self = this;
    return new Promise(function (accept, reject) {
      if (self.fd) {
        return reject(new Error('File already open (' + self.dev_name + ')'));
      }

      const fd = fs.createReadStream(self.dev_name);
      function openingErrorHandler(err) {
        return reject(err);
      };
      fd.on('error', openingErrorHandler);
      fd.on('open', function () {
        fd.removeListener('error', openingErrorHandler);
        self.fd = fd;
        self.fd.on('data', function(data) { self.ondata(data); });
        log.info('%s - Opened', self.name());
        return accept(self);
      });
    });
  }

  ondata(data) {
    var datacur = 0;
    while (datacur < data.length) {
      const data_left = data.length - datacur;
      const data_for_this_buf = min(data_left, KEYPRESS_PACKET_SIZE);
      for (var i = 0; i < data_for_this_buf; i++) {
        this.buf[this.cur + i] = data[datacur + i];
      }
      this.cur += i;
      datacur += i;
      if (this.cur == KEYPRESS_PACKET_SIZE) {
        this.onpacket();
      }
    }
  }

  onpacket() {
    if (this.cur != KEYPRESS_PACKET_SIZE) {
      log.error('onpacket() called with an incomplete packet (%d), skipping',
        this.cur);
      return;
    }

    // Total input is < 4 bytes: read into a UInt so bit ops are easy
    const packetBuf = Buffer.alloc(4, 0);
    this.buf.copy(packetBuf, 0); // Copy this.buf to last 3 bytes of packetBuf
    const newKey = packetBuf.readUInt32LE(0);
    this.cur = 0;
    const xorBits = this.last_key ^ newKey;

    log.debug('%s - onpacket(%d, %d, %d)', this.name(), this.last_key, newKey,
      xorBits);

    Object.keys(KEYPRESSES).forEach(function(keypress) {
      const bit = KEYPRESSES[keypress];
      if (bit & xorBits) {
        const on = bit & newKey ? 1 : 0;
        this.emitkey(keypress, on);
      }
    }, this);
    this.last_key = newKey;
  }

  emitkey(keyName, on) {
    const self = this;
    const key = this.keys[keyName]
    const eventName = keyName + (on ? '_ON' : '_OFF');
    log.debug('%s detected keypress %s', this.name(), eventName);

    this.events++;
    key.events++;
    key.last = new Date().toString();
    key.position = on;

    process.nextTick(function () { self.emit(eventName); });
  }

  name() {
    return 'Saitek Switch Panel (' + this.dev_name + ')';
  }

  attachRoutes(router, root) {
    const self = this;
    return new Promise(function (accept, reject) {
      router.get(root, function (req, res) {
        return res.json([
          'status',
          'keys',
        ]);
      });
      router.get(root + '/status', function (req, res) {
        return res.json(self.status());
      });
      router.get(root + '/keys', function (req, res) {
        return res.json(Object.keys(self.keys));
      });
      router.get(root + '/keys/:key', function (req, res) {
        const keyName = req.params.key;
        const key = KEYPRESSES[keyName];
        if (!key) { return res.sendStatus(404); }
        return res.json(self.keyStatus(keyName));
      });
      return accept();
    });
  };

  status() {
    return {
      'events' : this.events,
      'dev_name' : this.dev_name,
      'driver_name': this.driver_name,
      'cur': this.cur,
      'last_key': this.last_key,
    };
  }

  keyStatus(key) {
    return this.keys[key];
  }
};

module.exports.create = function (opts) {
  const panel = new Panel(opts);

  return panel.open();
};
