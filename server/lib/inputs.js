const drivers = require('./drivers');
const log = require('../log');
const _ = require('lodash');

const defaultDevices = [
  {
    'name' : 'hidraw0',
    'driver': 'sai_switch_panel',
    'device': '/dev/hidraw0',
  },
];

class InputDeviceManager {
  constructor() {
    this.devices = {};
  }

  static loadDevice(devDesc) {
    return new Promise(function (accept, reject) {
      const driver = drivers[devDesc.driver];
      if (!driver) {
        return reject('No input driver ' + devDesc.driver);
      }
      driver.create(devDesc).then(accept, reject);
    });
  }

  loadDefaultDevices() {
    var self = this;
    var devPromises = [];
    defaultDevices.forEach(function (devDesc) {
      devPromises.push(
        InputDeviceManager.loadDevice(devDesc)
        .then(function (dev) {
          if (self.devices[devDesc.name]) {
            return reject('Duplicate devices ' + devDesc.name);
          }
          self.devices[devDesc.name] = dev;
        })
        .catch(function (err) {
          log.warn('Failed to load device ' + devDesc.device + ': ' + err);
        })
      );
    });
    return Promise.all(devPromises).then(function() {
      log.info('Loaded %d input devices', Object.keys(self.devices).length);
    });
  }

  createRoutes(router) {
    var self = this;
    return new Promise(function (accept, reject) {
      router.get('/inputs', function (req, res) {
        return res.json(Object.keys(self.devices));
      });
      router.get('/inputs/:dev', function (req, res) {
        const devParam = req.params.dev;
        if (!self.devices[devParam]) { return res.sendStatus(404); }

        return res.json([
          'status',
        ]);
      });
      router.get('/inputs/:dev/status', function (req, res) {
        const devParam = req.params.dev;
        const dev = self.devices[devParam];
        if (!dev) { return res.sendStatus(404); }

        return res.json(dev.status());
      });

      return accept();
    });
  }
}


module.exports.init = function (router) {
  return new Promise(function (accept, reject) {
    const manager = new InputDeviceManager();

    Promise.all([
      manager.loadDefaultDevices(),
      manager.createRoutes(router),
    ])
    .then(function() { return accept(manager); })
    .catch(reject);
  });
};
