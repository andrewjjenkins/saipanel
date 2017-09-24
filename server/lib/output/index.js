'use strict';
const drivers = require('./drivers');
const log = require('../log');

const defaultDevices = [
  {
    'name': 'hidg0',
    'driver': 'hid_keyboard_gadget',
    'device': '/dev/hidg0',
  },
];

class OutputDeviceManager {
  constructor() {
    this.devices = {};
  }

  static loadDevice(devDesc) {
    return new Promise(function (accept, reject) {
      const driver = drivers[devDesc.driver];
      if (!driver) {
        return reject('No output driver ' + devDesc.driver);
      }
      driver.create(devDesc).then(accept, reject);
    });
  }

  loadDefaultDevices() {
    var self = this;
    var devPromises = [];
    defaultDevices.forEach(function (devDesc) {
      devPromises.push(
        OutputDeviceManager.loadDevice(devDesc)
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
      log.info('Loaded %d output devices', Object.keys(self.devices).length);
    });
  }

  createRoutes(router) {
    var self = this;
    return new Promise(function (accept, reject) {
      const devNames = Object.keys(self.devices);
      router.get('/outputs', function (req, res) {
        return res.json(devNames);
      });

      const devRoutePromises = [];

      devNames.forEach(function(devName) {
        const dev = self.devices[devName];
        devRoutePromises.push(dev.attachRoutes(router, '/outputs/' + devName));
      });
      Promise.all(devRoutePromises).then(accept, reject);
    });
  }
}

module.exports.init = function(router) {
  return new Promise(function (accept, reject) {
    const manager = new OutputDeviceManager();

    manager.loadDefaultDevices()
      .then(function() { return manager.createRoutes(router); })
      .then(function() { 
        return accept(manager);
      })
      .catch(reject);
  });
};
