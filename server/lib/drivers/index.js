[ 
  'sai_switch_panel',
].forEach(function (name) {
  module.exports[name] = require('./' + name);
});
