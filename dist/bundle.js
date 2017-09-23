/* leaflet-vega - v0.5.1 - Sat Sep 23 2017 19:25:33 GMT-0400 (EDT)
 * Copyright (c) 2017 Yuri Astrakhan <YuriAstrakhan@gmail.com> 
 * BSD-2-Clause */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('leaflet')) :
	typeof define === 'function' && define.amd ? define(['leaflet'], factory) :
	(factory(global.L));
}(this, (function (L) { 'use strict';

L = L && L.hasOwnProperty('default') ? L['default'] : L;

var version = "0.5.1";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _class = function () {
  function _class(onWarning) {
    _classCallCheck(this, _class);

    this.onWarning = onWarning || (console ? console.log : function () {});
  }

  /**
   * Add values like signals to a vega spec, or ignore if the they are already defined.
   * @param {object} spec vega spec to modify and return
   * @param {string} field name of the vega spec branch, e.g. `signals`
   * @param {<object|string>[]} values to add
   * @return {object} returns the same spec object as passed in
   */


  _class.prototype.addToList = function addToList(spec, field, values) {
    var newSigs = new Map(values.map(function (v) {
      return typeof v === "string" ? [v, { name: v }] : [v.name, v];
    }));

    for (var _iterator = this.findUndefined(spec, field, newSigs.keys()), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var sig = _ref;

      spec[field].push(newSigs.get(sig));
    }

    return spec;
  };

  /**
   * Set a spec field, and warn if overriding an existing value in that field
   * @param {object} spec vega spec to modify and return
   * @param {string} field
   * @param {*} value
   * @return {object} returns the same spec object as passed in
   */


  _class.prototype.overrideField = function overrideField(spec, field, value) {
    if (spec[field] && spec[field] !== value) {
      this.onWarning("Overriding " + field + ": " + spec[field] + " \uD800\uDCD8 " + value);
    }
    spec[field] = value;
    return spec;
  };

  /**
   * Find all names that are not defined in the spec's section. Creates section if missing.
   * @param {object} spec
   * @param {string} section
   * @param {Iterable.<string>} names
   * @return {Iterable.<string>}
   */


  _class.prototype.findUndefined = function findUndefined(spec, section, names) {
    if (!spec.hasOwnProperty(section)) {
      spec[section] = [];
      return names;
    } else if (!Array.isArray(spec[section])) {
      throw new Error("spec." + section + " must be an array");
    }

    var nameStrings = new Set(names);
    for (var _iterator2 = spec[section], _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
      var _ref2;

      if (_isArray2) {
        if (_i2 >= _iterator2.length) break;
        _ref2 = _iterator2[_i2++];
      } else {
        _i2 = _iterator2.next();
        if (_i2.done) break;
        _ref2 = _i2.value;
      }

      var obj = _ref2;

      // If obj has a name field, delete that name from the names
      // Set will silently ignore delete() for undefined names
      if (obj.name) nameStrings.delete(obj.name);
    }

    return nameStrings;
  };

  return _class;
}();

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();



var asyncToGenerator = function (fn) {
  return function () {
    var gen = fn.apply(this, arguments);
    return new Promise(function (resolve, reject) {
      function step(key, arg) {
        try {
          var info = gen[key](arg);
          var value = info.value;
        } catch (error) {
          reject(error);
          return;
        }

        if (info.done) {
          resolve(value);
        } else {
          return Promise.resolve(value).then(function (value) {
            step("next", value);
          }, function (err) {
            step("throw", err);
          });
        }
      }

      return step("next");
    });
  };
};

L.vega = function (spec, options) {
  return new L.VegaLayer(spec, options);
};

L.VegaLayer = (L.Layer ? L.Layer : L.Class).extend({

  options: {
    // FIXME: uses window.vega
    vega: window && window.vega,

    // If Vega spec creates controls (inputs), put them all into this container
    bindingsContainer: undefined,

    // Options to be passed to the Vega`s parse method
    parseConfig: undefined,

    // Options to be passed ot the Vega`s View constructor
    viewConfig: undefined,

    // If true, graph will be repainted only after the map has finished moving (faster)
    delayRepaint: true,

    // optional warning handler:   (warning) => { ... }
    onWarning: false,

    // optional error handler:   (err) => { ...; throw err; }
    onError: false
  },

  initialize: function initialize(spec, options) {
    var _this = this;

    L.Util.setOptions(this, options);

    this._ignoreSignals = 0;
    this.disableSignals = function () {
      _this._ignoreSignals++;
    };
    this.enableSignals = function () {
      _this._ignoreSignals--;
      if (_this._ignoreSignals < 0) {
        _this._ignoreSignals = 0;
        throw new Error('Too many calls to enableSignals()');
      }
    };
    this._vsi = new _class(options.onWarning);
    this._spec = this._updateGraphSpec(spec);
  },

  /**
   * @param {L.Map} map
   * @return {L.VegaLayer}
   */
  addTo: function addTo(map) {
    map.addLayer(this);
    return this;
  },

  onAdd: function onAdd(map) {
    this._onAddAsync(map);
    return this;
  },

  _onAddAsync: function () {
    var _ref = asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(map) {
      var _this2 = this;

      var vega, dataflow, oldLoad, onSignal;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              this.disableSignals();

              _context.prev = 1;

              this._map = map;
              this._vegaContainer = L.DomUtil.create('div', 'leaflet-vega-container');
              map._panes.overlayPane.appendChild(this._vegaContainer);

              vega = this.options.vega;
              dataflow = vega.parse(this._spec, this.options.parseConfigp);
              oldLoad = this.options.viewConfig.loader.load.bind(this.options.viewConfig.loader);

              this.options.viewConfig.loader.load = function (uri, opt) {
                return oldLoad(uri, opt);
              };
              this._view = new vega.View(dataflow, this.options.viewConfig);

              if (this.options.onWarning) {
                this._view.warn = this.options.onWarning;
              }

              if (this.options.onError) {
                this._view.error = this.options.onError;
              }

              this._view.padding({ left: 0, right: 0, top: 0, bottom: 0 }).initialize(this._vegaContainer, this.options.bindingsContainer).hover();

              onSignal = function onSignal(sig, value) {
                return _this2._onSignalChange(sig, value);
              };

              this._view.addSignalListener('latitude', onSignal).addSignalListener('longitude', onSignal).addSignalListener('zoom', onSignal);

              map.on(this.options.delayRepaint ? 'moveend' : 'move', function () {
                return _this2._resetAsync();
              });
              map.on('zoomend', function () {
                return _this2._resetAsync();
              });

              _context.next = 19;
              return this._resetAsync(true);

            case 19:
              _context.next = 24;
              break;

            case 21:
              _context.prev = 21;
              _context.t0 = _context['catch'](1);

              if (this.options.onError) {
                this.options.onError(_context.t0);
              }

            case 24:
              _context.prev = 24;

              this.enableSignals();
              return _context.finish(24);

            case 27:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this, [[1, 21, 24, 27]]);
    }));

    function _onAddAsync(_x) {
      return _ref.apply(this, arguments);
    }

    return _onAddAsync;
  }(),

  onRemove: function onRemove() {
    if (this._view) {
      this._view.finalize();
      this._view = null;
    }

    // TODO: once Leaflet 0.7 is fully out of the picture, replace this with L.DomUtil.empty()
    var el = this._vegaContainer;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  },

  _onSignalChange: function _onSignalChange(sig, value) {
    if (this._ignoreSignals) {
      return;
    }

    var map = this._map;
    var center = map.getCenter();
    var zoom = map.getZoom();

    switch (sig) {
      case 'latitude':
        center.lat = value;
        break;
      case 'longitude':
        center.lng = value;
        break;
      case 'zoom':
        zoom = value;
        break;
      default:
        return; // ignore
    }

    map.setView(center, zoom);

    this._resetAsync(); // ignore promise
  },

  _resetAsync: function () {
    var _ref2 = asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(force) {
      var map, view, topLeft, size, center, zoom, sendSignal, changed;
      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (this._view) {
                _context2.next = 2;
                break;
              }

              return _context2.abrupt('return');

            case 2:

              this.disableSignals();
              _context2.prev = 3;
              map = this._map;
              view = this._view;
              topLeft = map.containerPointToLayerPoint([0, 0]);

              L.DomUtil.setPosition(this._vegaContainer, topLeft);

              size = map.getSize();
              center = map.getCenter();
              zoom = map.getZoom();

              // Only send changed signals to Vega. Detect if any of the signals have changed before calling run()

              sendSignal = function sendSignal(sig, value) {
                if (view.signal(sig) !== value) {
                  view.signal(sig, value);
                  return 1;
                }
                return 0;
              };

              changed = 0;

              changed |= sendSignal('width', size.x);
              changed |= sendSignal('height', size.y);
              changed |= sendSignal('latitude', center.lat);
              changed |= sendSignal('longitude', center.lng);
              changed |= sendSignal('zoom', zoom);

              if (!(changed || force)) {
                _context2.next = 21;
                break;
              }

              _context2.next = 21;
              return view.runAsync();

            case 21:
              _context2.next = 26;
              break;

            case 23:
              _context2.prev = 23;
              _context2.t0 = _context2['catch'](3);

              if (this.options.onError) {
                this.options.onError(_context2.t0);
              }

            case 26:
              _context2.prev = 26;

              this.enableSignals();
              return _context2.finish(26);

            case 29:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, this, [[3, 23, 26, 29]]);
    }));

    function _resetAsync(_x2) {
      return _ref2.apply(this, arguments);
    }

    return _resetAsync;
  }(),

  /**
   Inject signals into the spec
   */
  _updateGraphSpec: function _updateGraphSpec(spec) {
    this._vsi.overrideField(spec, 'padding', 0);
    this._vsi.overrideField(spec, 'autosize', 'none');
    this._vsi.addToList(spec, 'signals', ['zoom', 'latitude', 'longitude']);
    this._vsi.addToList(spec, 'projections', [{
      name: 'projection',
      type: 'mercator',
      scale: { signal: '256*pow(2,zoom)/2/PI' },
      rotate: [{ signal: '-longitude' }, 0, 0],
      center: [0, { signal: 'latitude' }],
      translate: [{ signal: 'width/2' }, { signal: 'height/2' }]
    }]);

    return spec;
  }

});

L.VegaLayer.version = version;

})));
//# sourceMappingURL=bundle.js.map
