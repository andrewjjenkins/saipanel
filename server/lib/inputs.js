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
      const devNames = Object.keys(self.devices);
      router.get('/inputs', function (req, res) {
        return res.json(devNames);
      });

      const devRoutePromises = [];

      devNames.forEach(function(devName) {
        const dev = self.devices[devName];
        devRoutePromises.push(dev.attachRoutes(router, '/inputs/' + devName));
      });
      Promise.all(devRoutePromises).then(accept, reject);
    });
  }
}


module.exports.init = function (router) {
  return new Promise(function (accept, reject) {
    const manager = new InputDeviceManager();

    manager.loadDefaultDevices()
      .then(function() { return manager.createRoutes(router); })
      .then(function() { return accept(manager); })
      .catch(reject);
  });
};
