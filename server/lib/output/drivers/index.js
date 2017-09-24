[ 
  'hid_keyboard_gadget',
].forEach(function (name) {
  module.exports[name] = require('./' + name);
});
