import { version } from '../package.json';
import Vsi from 'vega-spec-injector';
import L from 'leaflet';

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
    onError: false,
  },

  initialize: function (spec, options) {
    L.Util.setOptions(this, options);

    // expression parsing in Vega is global,
    // ensure it hasn't been intialized before,
    // and make sure calls to setMapView() only happen
    // when the View instance was created by us
    const vega = this.options.vega;
    if (!vega.expressionFunction('setMapView')) {
      vega.expressionFunction('setMapView',
        /**
         * Given longitude/latitude/zoom, position the map to those coordinates
         * The function can be called in one of the following ways:
         *  setMapView(latitude, longitude)
         *  setMapView(latitude, longitude, zoom)
         *  setMapView([longitude, latitude])
         *  setMapView([longitude, latitude], zoom)
         */
        function () {
          const handler = this.context.dataflow.Leaflet_setMapViewHandler;
          if (!handler) throw new Error('setMapView() is not defined for this graph');
          let longitude, latitude, zoom;

          function checkArray(val, ind) {
            if (!val || !Array.isArray(val) || val.length !== 2 ||
              typeof val[0] !== 'number' || typeof val[1] !== 'number'
            ) {
              throw new Error(`setMapView's ${ind} parameter must be a 2 value array [longitude, latitude], or it can be used as setMapView(latitude, longitude, optional_zoom)`);
            }
            return val;
          }

          switch (arguments.length) {
            default:
              throw new Error('Unexpected number of setMapView parameters');
            case 1:
              [longitude, latitude] = checkArray(arguments[0], '1st');
              break;
            case 2:
              if (Array.isArray(arguments[0])) {
                [longitude, latitude] = checkArray(arguments[0], '1st');
                zoom = arguments[1];
              } else {
                [latitude, longitude] = arguments;
              }
              break;
            case 3:
              [latitude, longitude, zoom] = arguments;
              break;
          }
          handler(latitude, longitude, zoom);
        });
    }

    this._ignoreSignals = 0;
    this.disableSignals = () => {
      this._ignoreSignals++;
    };
    this.enableSignals = () => {
      this._ignoreSignals--;
      if (this._ignoreSignals < 0) {
        this._ignoreSignals = 0;
        throw new Error(`Too many calls to enableSignals()`);
      }
    };

    // Inject signals into the spec
    const vsi = new Vsi(options.onWarning);

    vsi.overrideField(spec, `padding`, 0);
    vsi.overrideField(spec, `autosize`, `none`);
    vsi.addToList(spec, `signals`, [`zoom`, `latitude`, `longitude`]);
    vsi.addToList(spec, `projections`, [this.defaultProjection]);

    this._spec = spec;
  },

  /**
   * @param {L.Map} map
   * @return {L.VegaLayer}
   */
  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  onAdd: function (map) {
    this._onAddAsync(map);
    return this;
  },

  _onAddAsync: async function (map) {
    this.disableSignals();

    try {
      this._map = map;
      this._vegaContainer = L.DomUtil.create(`div`, `leaflet-vega-container`);
      map._panes.overlayPane.appendChild(this._vegaContainer);

      const vega = this.options.vega;

      const dataflow = vega.parse(this._spec, this.options.parseConfig);

      const viewConfig = this.options.viewConfig;
      if (viewConfig && viewConfig.loader) {
        const oldLoad = viewConfig.loader.load.bind(viewConfig.loader);
        viewConfig.loader.load = (uri, opt) => {
          return oldLoad(uri, opt);
        };
      }
      this._view = new vega.View(dataflow, viewConfig);

      if (this.options.onWarning) {
        this._view.warn = this.options.onWarning;
      }

      if (this.options.onError) {
        this._view.error = this.options.onError;
      }

      this._view
        .padding({ left: 0, right: 0, top: 0, bottom: 0 })
        .initialize(this._vegaContainer, this.options.bindingsContainer)
        .hover();

      const onSignal = (sig, value) => this._onSignalChange(sig, value);

      this._view
        .addSignalListener(`latitude`, onSignal)
        .addSignalListener(`longitude`, onSignal)
        .addSignalListener(`zoom`, onSignal);

      map.on(this.options.delayRepaint ? `moveend` : `move`, () => this._resetAsync());
      map.on(`zoomend`, () => this._resetAsync());

      this._view.Leaflet_setMapViewHandler = (lat, lng, zoom) => {
        if (zoom === undefined) {
          zoom = map.getZoom();
        }
        map.setView({lat, lng}, zoom);
        this._resetAsync(); // ignore promise
      };

      await this._resetAsync(true);
    } catch (err) {
      if (this.options.onError) {
        this.options.onError(err);
      }
    } finally {
      this.enableSignals();
    }
  },

  onRemove: function () {
    if (this._view) {
      this._view.finalize();
      this._view = null;
    }

    // TODO: once Leaflet 0.7 is fully out of the picture, replace this with L.DomUtil.empty()
    const el = this._vegaContainer;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  },

  _onSignalChange: function (sig, value) {
    if (this._ignoreSignals) {
      return;
    }

    const map = this._map;
    let center = map.getCenter();
    let zoom = map.getZoom();

    switch (sig) {
      case `latitude`:
        center.lat = value;
        break;
      case `longitude`:
        center.lng = value;
        break;
      case `zoom`:
        zoom = value;
        break;
      default:
        return; // ignore
    }

    map.setView(center, zoom);

    this._resetAsync(); // ignore promise
  },

  _resetAsync: async function (force) {
    if (!this._view) return;

    this.disableSignals();
    try {
      const map = this._map;
      const view = this._view;
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._vegaContainer, topLeft);

      const size = map.getSize();
      const center = map.getCenter();
      const zoom = map.getZoom();

      // Only send changed signals to Vega. Detect if any of the signals have changed before calling run()
      const sendSignal = (sig, value) => {
        if (view.signal(sig) !== value) {
          view.signal(sig, value);
          return 1;
        }
        return 0;
      };

      let changed = 0;
      changed |= sendSignal(`width`, size.x);
      changed |= sendSignal(`height`, size.y);
      changed |= sendSignal(`latitude`, center.lat);
      changed |= sendSignal(`longitude`, center.lng);
      changed |= sendSignal(`zoom`, zoom);

      if (changed || force) {
        await view.runAsync();
      }
    } catch (err) {
      if (this.options.onError) {
        this.options.onError(err);
      }
    } finally {
      this.enableSignals();
    }
  },

  defaultProjection: {
    name: `projection`,
    type: `mercator`,
    scale: { signal: `256*pow(2,zoom)/2/PI` },
    rotate: [{ signal: `-longitude` }, 0, 0],
    center: [0, { signal: `latitude` }],
    translate: [{ signal: `width/2` }, { signal: `height/2` }],
    fit: false,
  },

});

L.VegaLayer.version = version;
