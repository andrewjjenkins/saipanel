'use strict';
const fs = require('fs');
const net = require('net');
const EventEmitter = require('events');
const promisify = require('util.promisify');

const log = require('../../log');

const KEYPRESS_PACKET_SIZE = 3;
const KEYPRESSES = {
  'MASTER_BAT' : 0x1,
  'MASTER_ALT' : 0x2,
  'AVIONICS_MASTER' : 0x4,
  'FUELPUMP' : 0x8,
  'DEICE' : 0x10,
  'PITOTHEAT' : 0x20,
  'COWL' : 0x40,
  'LIGHTS_PANEL' : 0x80,
  'LIGHTS_BEACON' : 0x100,
  'LIGHTS_NAV' : 0x200,
  'LIGHTS_STROBE' : 0x400,
  'LIGHTS_TAXI' : 0x800,
  'LIGHTS_LANDING' : 0x1000,
};

const GEAR_POSITIONS = {
  'GEAR_UP': 0x40000,
  'GEAR_DOWN': 0x80000,
};

const MAGNETO_POSITIONS = {
  'OFF': 0x2000,
  'R': 0x4000,
  'L': 0x8000,
  'ALL': 0x10000,
  'START': 0x20000,
};

var MAGNETO_BITMASK = 0;
Object.keys(MAGNETO_POSITIONS).forEach(function(pos) {
  MAGNETO_BITMASK |= MAGNETO_POSITIONS[pos];
});

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

    this.keys['GEAR'] = {
      'events': 0,
      'last': '',
      'position': 0,
    };

    this.keys['MAGNETO'] = {
      'events': 0,
      'last': '',
      'position': 0,
    };
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

    // Switches have a bit that represents whether the switch is on or off
    Object.keys(KEYPRESSES).forEach(function(keypress) {
      const bit = KEYPRESSES[keypress];
      if (bit & xorBits) {
        const on = bit & newKey ? 1 : 0;
        this.emitkey(keypress, on);
      }
    }, this);

    // Gear has two switches, where either the _UP or _DOWN
    // switch is on.
    if (xorBits & GEAR_POSITIONS.GEAR_UP) {
      if (newKey & GEAR_POSITIONS.GEAR_UP) {
        if (newKey & GEAR_POSITIONS.GEAR_DOWN) {
          log.error('%s: Gear up and gear down!', this.name());
        } else {
          this.emitgear(1);
        }
      } else if (newKey & GEAR_POSITIONS.GEAR_DOWN) {
        if (newKey & GEAR_POSITIONS.GEAR_UP) {
          log.error('%s: Gear up and gear down!', this.name());
        } else {
          this.emitgear(0);
        }
      } else {
        log.error('Unknown gear state change (%d)', this.newKey);
      }
    }

    // Rotary has several positions
    if (xorBits & MAGNETO_BITMASK) {
      const magnetoBits = newKey & MAGNETO_BITMASK;
      log.debug('%s: Evaluating magneto bits %d', this.name(), magnetoBits);

      var matched = false;
      Object.keys(MAGNETO_POSITIONS).forEach(function(pos) {
        if (MAGNETO_POSITIONS[pos] & magnetoBits) {
          if (matched) {
            log.error('%s: Found extra magneto position (%s)', pos);
          } else {
            this.emitmagneto(pos);
            matched = true;
          }
        }
      }, this);
    }

    this.last_key = newKey;
  }

  emitmagneto(pos) {
    const key = this.keys.MAGNETO;
    const eventName = 'MAGNETO' + '_' + pos;
    this.deferEmit([eventName], key, pos);
  }

  emitgear(up) {
    const key = this.keys.GEAR;
    const eventName = 'GEAR' + (up ? '_UP' : '_DOWN');
    this.deferEmit([eventName, 'GEAR_TOGGLE'], key, up);
  }

  emitkey(keyName, on) {
    const key = this.keys[keyName];
    const eventName = keyName + (on ? '_ON' : '_OFF');
    this.deferEmit([eventName, keyName + '_TOGGLE'], key, on);
  }

  deferEmit(evs, key, pos) {
    const self = this;
    self.events++;
    key.events++;
    key.last = new Date().toString();
    key.position = pos;
    process.nextTick(function () {
      evs.forEach(function(ev) {
        log.debug('%s emitting %s', self.name(), ev);
        self.emit(ev);
      });
    });
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
        if (keyName == 'GEAR') {
          return res.json(self.keyStatus('GEAR'));
        }
        if (keyName == 'MAGNETO') {
          return res.json(self.keyStatus('MAGNETO'));
        }
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
