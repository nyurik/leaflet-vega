/* leaflet-vega - v0.8.6 - Mon Apr 23 2018 00:57:57 GMT+0300 (MSK)
 * Copyright (c) 2018 Yuri Astrakhan <YuriAstrakhan@gmail.com> 
 * BSD-2-Clause */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('leaflet')) :
	typeof define === 'function' && define.amd ? define(['leaflet'], factory) :
	(factory(global.L));
}(this, (function (L) { 'use strict';

L = L && L.hasOwnProperty('default') ? L['default'] : L;

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

var version = "0.8.6";

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































var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

// eslint-disable-next-line import/extensions,import/no-unresolved
L.vega = function vega(spec, options) {
  return new L.VegaLayer(spec, options);
};

L.VegaLayer = (L.Layer ? L.Layer : L.Class).extend({

  options: {
    // FIXME: uses window.vega
    // eslint-disable-next-line no-undef
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

    // expression parsing in Vega is global,
    // ensure it hasn't been intialized before,
    // and make sure calls to setMapView() only happen
    // when the View instance was created by us
    var vega = this.options.vega;

    if (!vega.expressionFunction('setMapView')) {
      vega.expressionFunction('setMapView', function setMapView() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        var view = this.context.dataflow;
        var handler = view.Leaflet_setMapViewHandler;
        if (!handler) throw new Error('setMapView() is not defined for this graph');
        view.runAfter(function () {
          return handler.apply(undefined, args);
        });
      });
    }
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

    // Inject signals into the spec
    var vsi = new _class(options.onWarning);

    vsi.overrideField(spec, 'padding', 0);
    vsi.overrideField(spec, 'autosize', 'none');
    vsi.addToList(spec, 'signals', ['zoom', 'latitude', 'longitude']);
    vsi.addToList(spec, 'projections', [this.defaultProjection]);

    this._spec = spec;
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
  _onAddAsync: function _onAddAsync(map) {
    var _this2 = this;

    return asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
      var _options, vega, viewConfig, dataflow, oldLoad, onSignal;

      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _this2.disableSignals();

              _context.prev = 1;

              _this2._map = map;
              _this2._vegaContainer = L.DomUtil.create('div', 'leaflet-vega-container');
              map._panes.overlayPane.appendChild(_this2._vegaContainer);

              _options = _this2.options, vega = _options.vega, viewConfig = _options.viewConfig;
              dataflow = vega.parse(_this2._spec, _this2.options.parseConfig);


              if (viewConfig && viewConfig.loader) {
                oldLoad = viewConfig.loader.load.bind(viewConfig.loader);

                viewConfig.loader.load = function (uri, opt) {
                  return oldLoad(uri, opt);
                };
              }
              _this2._view = new vega.View(dataflow, viewConfig);

              if (!viewConfig || viewConfig.logLevel === undefined) {
                _this2._view.logLevel(vega.Warn);
              }
              if (_this2.options.onWarning) {
                _this2._view.warn = _this2.options.onWarning;
              }
              if (_this2.options.onError) {
                _this2._view.error = _this2.options.onError;
              }

              _this2._view.padding({
                left: 0, right: 0, top: 0, bottom: 0
              }).initialize(_this2._vegaContainer, _this2.options.bindingsContainer).hover();

              onSignal = function onSignal(sig, value) {
                return _this2._onSignalChange(sig, value);
              };

              _this2._view.addSignalListener('latitude', onSignal).addSignalListener('longitude', onSignal).addSignalListener('zoom', onSignal);

              map.on(_this2.options.delayRepaint ? 'moveend' : 'move', function () {
                return _this2._resetAsync();
              });
              map.on('zoomend', function () {
                return _this2._resetAsync();
              });

              /**
               * Given longitude/latitude/zoom or bounding box, position the map to those coordinates
               * The function can be called in one of the following ways:
               *  setMapView(latitude, longitude)
               *  setMapView(latitude, longitude, zoom)
               *  setMapView([longitude, latitude])
               *  setMapView([longitude, latitude], zoom)
               *  setMapView([[lng1,lat1],[lng2,lat2]])
               */
              _this2._view.Leaflet_setMapViewHandler = function () {
                for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                  args[_key2] = arguments[_key2];
                }

                function throwError() {
                  throw new Error('Unexpected setMapView() parameters. It could be called with a bounding box setMapView([[longitude1,latitude1],[longitude2,latitude2]]), or it could be the center point setMapView([longitude, latitude], optional_zoom), or it can be used as setMapView(latitude, longitude, optional_zoom)');
                }

                function checkArray(val) {
                  if (!Array.isArray(val) || val.length !== 2 || typeof val[0] !== 'number' || typeof val[1] !== 'number') {
                    throwError();
                  }
                  return val;
                }

                var lng = void 0;
                var lat = void 0;
                var zoom = void 0;
                switch (args.length) {
                  default:
                    throwError();
                    break;
                  case 1:
                    {
                      var arg = args[0];
                      if (Array.isArray(arg) && arg.length === 2 && Array.isArray(arg[0]) && Array.isArray(arg[1])) {
                        // called with a bounding box, need to reverse order
                        var _checkArray = checkArray(arg[0]),
                            _checkArray2 = slicedToArray(_checkArray, 2),
                            lng1 = _checkArray2[0],
                            lat1 = _checkArray2[1];

                        var _checkArray3 = checkArray(arg[1]),
                            _checkArray4 = slicedToArray(_checkArray3, 2),
                            lng2 = _checkArray4[0],
                            lat2 = _checkArray4[1];

                        map.fitBounds(L.latLngBounds(L.latLng(lat1, lng1), L.latLng(lat2, lng2)));
                      } else {
                        var _checkArray5 = checkArray(arg);
                        // called with a center point and no zoom


                        var _checkArray6 = slicedToArray(_checkArray5, 2);

                        lng = _checkArray6[0];
                        lat = _checkArray6[1];
                      }
                      break;
                    }
                  case 2:
                    if (Array.isArray(args[0])) {
                      // eslint-disable-next-line prefer-destructuring
                      var _checkArray7 = checkArray(args[0]);

                      var _checkArray8 = slicedToArray(_checkArray7, 2);

                      lng = _checkArray8[0];
                      lat = _checkArray8[1];
                      zoom = args[1];
                    } else {
                      lat = args[0];
                      lng = args[1];
                    }
                    break;
                  case 3:
                    lat = args[0];
                    lng = args[1];
                    zoom = args[2];

                    break;
                }

                if (lat !== undefined && lng !== undefined) {
                  if (typeof lat !== 'number' || typeof lng !== 'number') {
                    throwError();
                  }
                  if (zoom === undefined) {
                    zoom = map.getZoom();
                  } else if (typeof zoom !== 'number') {
                    throwError();
                  }
                  map.setView({ lat: lat, lng: lng }, zoom);
                }
              };
              _context.next = 20;
              return _this2._resetAsync(true);

            case 20:
              _context.next = 25;
              break;

            case 22:
              _context.prev = 22;
              _context.t0 = _context['catch'](1);

              _this2._reportError(_context.t0);

            case 25:
              _context.prev = 25;

              _this2.enableSignals();
              return _context.finish(25);

            case 28:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, _this2, [[1, 22, 25, 28]]);
    }))();
  },
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
  _reportError: function _reportError(err) {
    /* eslint-disable no-console */
    if (this.options.onError) {
      this.options.onError(err);
    } else if (console && console.error) {
      console.error(err);
    }
    /* eslint-enable */
  },
  _onSignalChange: function _onSignalChange(sig, value) {
    if (this._ignoreSignals) {
      return;
    }

    try {
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
    } catch (err) {
      this._reportError(err);
    }
  },
  _resetAsync: function _resetAsync(force) {
    var _this3 = this;

    return asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
      var map, view, topLeft, size, center, zoom, sendSignal, changed;
      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (_this3._view) {
                _context2.next = 2;
                break;
              }

              return _context2.abrupt('return');

            case 2:

              _this3.disableSignals();
              _context2.prev = 3;
              map = _this3._map;
              view = _this3._view;
              topLeft = map.containerPointToLayerPoint([0, 0]);

              L.DomUtil.setPosition(_this3._vegaContainer, topLeft);

              size = map.getSize();
              center = map.getCenter();
              zoom = map.getZoom();

              // Only send changed signals to Vega.
              // Detect if any of the signals have changed before calling run()

              sendSignal = function sendSignal(sig, value) {
                if (view.signal(sig) !== value) {
                  view.signal(sig, value);
                  return 1;
                }
                return 0;
              };

              // update if any of the signal's values have changed


              changed = sendSignal('width', size.x) + sendSignal('height', size.y) + sendSignal('latitude', center.lat) + sendSignal('longitude', center.lng) + sendSignal('zoom', zoom);

              if (!(changed > 0 || force)) {
                _context2.next = 16;
                break;
              }

              _context2.next = 16;
              return view.runAsync();

            case 16:
              _context2.next = 21;
              break;

            case 18:
              _context2.prev = 18;
              _context2.t0 = _context2['catch'](3);

              _this3._reportError(_context2.t0);

            case 21:
              _context2.prev = 21;

              _this3.enableSignals();
              return _context2.finish(21);

            case 24:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, _this3, [[3, 18, 21, 24]]);
    }))();
  },


  defaultProjection: {
    name: 'projection',
    type: 'mercator',
    scale: { signal: '256*pow(2,zoom)/2/PI' },
    rotate: [{ signal: '-longitude' }, 0, 0],
    center: [0, { signal: 'latitude' }],
    translate: [{ signal: 'width/2' }, { signal: 'height/2' }],
    fit: false
  }

});

L.VegaLayer.version = version;

})));
//# sourceMappingURL=bundle.js.map
