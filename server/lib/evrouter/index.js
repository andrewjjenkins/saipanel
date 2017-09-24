'use strict';
const log = require('../log');

const defaultBindings = [
  {
    'name': 'gear',
    'input': 'hidraw0/GEAR_TOGGLE',
    'output': 'hidg0/writeKey(g)',
  },
];

const actionParserRe = /(\w+)\(([\w,\s]*)\)/;

class Binding {
  constructor(input_dev, input_ev_name, input_name, outputs, name) {
    const self = this;
    this.input = input_name;
    this.outputs = outputs;
    this.name = name;
    this.listener = function () { self.fire(); }
    this.events = 0;
    input_dev.on(input_ev_name, this.listener);
  }

  fire() {
    this.events++;
    var errors = [];
    this.outputs.forEach(function(output) {
      try {
        output.fire();
      } catch (err) {
        errors.push(err);
      }
    });
    if (errors.length) {
      log.warn('%s - encountered %d errors when fired', this.name, errors.length);
      errors.forEach(function (err, i) {
        log.warn('%d: %s', i, err);
      });
    } else {
      log.debug('%s - fired, no errors', this.name);
    }
  }

  getInfo() {
    return {
      input: this.input,
      outputs: this.outputs.map(function(out) { return out.name; }),
      events: this.events,
      name: this.name,
    };
  }
}

class OutputAction {
  constructor(on, method, args, name) {
    this.on = on;
    this.method = method;
    this.args = args;
    this.name = name;
  }

  fire() {
    return this.on[this.method].apply(this.on, this.args);
  }
}

class EvRouter {
  constructor(opts) {
    this.bindings = {}
    this.inputManager = opts.inputManager;
    this.outputManager = opts.outputManager;
  }

  createBinding(newBinding) {
    const [input_dev_name, input_ev_name] = newBinding.input.split('/', 2);
    const input_dev = this.inputManager.devices[input_dev_name];
    if (!input_dev) {
      throw new Error('Cannot find input dev %s', input_dev_name);
    }

    var outputs = [];
    const output_descriptions =
      Array.isArray(newBinding.output) ?
        newBinding.output : [ newBinding.output ];
    output_descriptions.forEach(function(outDesc) {
      const [out_dev_name, out_action_name] = outDesc.split('/', 2);
      const out_dev = this.outputManager.devices[out_dev_name];
      if (!out_dev) {
        throw new Error('Cannot find output dev ' + output_dev_name);
      }

      const match = actionParserRe.exec(out_action_name);
      if (!match) {
        throw new Error('Cannot parse action ' + out_action_name);
      }
      const [ method_name, args ] = [ match[1], match[2].split(',') ];

      log.debug('Created new output action (%s, %s, %s)',
        out_dev_name, method_name, args);
      outputs.push(new OutputAction(out_dev, method_name, args, outDesc));
    }, this);

    this.bindings[newBinding.name] = new Binding(
      input_dev,
      input_ev_name,
      newBinding.input,
      outputs,
      newBinding.name
    );
    log.debug('Created new binding %s', newBinding.name);
  }

  createDefaultBindings() {
    const self = this;
    return new Promise(function (accept, reject) {
      try {
        for(var i = 0; i < defaultBindings.length; i++) {
          self.createBinding(defaultBindings[i]);
        }
      } catch(err) {
        return reject(err);
      }
      return accept();
    });
  }

  getBindings() {
    var bindings = {}
    Object.keys(this.bindings).forEach(function (name) {
      bindings[name] = this.bindings[name].getInfo();
    }, this);
    return bindings;
  }

  createRoutes(router) {
    var self = this;
    return new Promise(function (accept, reject) {
      router.get('/bindings', function (req, res) {
        return res.json(self.getBindings());
      });
      return accept();
    });
  }
}

module.exports.init = function (opts) {
  return new Promise(function (accept, reject) {
    const evRouter = new EvRouter(opts);

    evRouter.createRoutes(opts.router)
      .then(function () { return evRouter.createDefaultBindings(); })
      .then(function () { return accept(evRouter); })
      .catch(reject);
  });
};
