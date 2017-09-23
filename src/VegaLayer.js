import {version} from '../package.json';
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

    let counter = 0;
    this.disableSignals = () => {
      counter++;
    };
    this.enableSignals = () => {
      counter--;
      if (counter < 0) {
        throw new Error(`too many signal enables`);
      }
    };
    this._vsi = new Vsi(options.onWarning);
    this._spec = this._updateGraphSpec(spec);
  },

  /**
   * @param {L.Map} map
   * @return {L.VegaLayer}
   */
  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  onAdd: async function (map) {
    this.disableSignals();

    try {
      this._map = map;
      this._vegaContainer = L.DomUtil.create(`div`, `leaflet-vega-container`);
      map._panes.overlayPane.appendChild(this._vegaContainer);

      const vega = this.options.vega;

      const dataflow = vega.parse(this._spec, this.options.parseConfigp);

      const oldLoad = this.options.viewConfig.loader.load.bind(this.options.viewConfig.loader);
      this.options.viewConfig.loader.load = (uri, opt) => {
        return oldLoad(uri, opt);
      };
      this._view = new vega.View(dataflow, this.options.viewConfig);

      if (this.options.onWarning) {
        this._view.warn = this.options.onWarning;
      }

      if (this.options.onError) {
        this._view.error = this.options.onError;
      }

      this._view
        .padding({left: 0, right: 0, top: 0, bottom: 0})
        .initialize(this._vegaContainer, this.options.bindingsContainer)
        .hover();

      const onSignal = (sig, value) => this._onSignalChange(sig, value);

      this._view
        .addSignalListener(`latitude`, onSignal)
        .addSignalListener(`longitude`, onSignal)
        .addSignalListener(`zoom`, onSignal);

      map.on(this.options.delayRepaint ? `moveend` : `move`, () => this._reset());
      map.on(`zoomend`, () => this._reset());

      return this._reset(true);
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

    this._reset(); // ignore promise
  },

  _reset: function (force) {

    return Promise.resolve().then(() => {
      this.disableSignals();

      if (!this._view) {
        return 0;
      }

      const map = this._map;
      const view = this._view;
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._vegaContainer, topLeft);

      const size = map.getSize();
      const center = map.getCenter();
      const zoom = map.getZoom();

      function sendSignal(sig, value) {
        if (view.signal(sig) !== value) {
          view.signal(sig, value);
          return 1;
        }

        return 0;
      }


      // Only send changed signals to Vega. Detect if any of the signals have changed before calling run()
      let changed = 0;
      changed |= sendSignal(`width`, size.x);
      changed |= sendSignal(`height`, size.y);
      changed |= sendSignal(`latitude`, center.lat);
      changed |= sendSignal(`longitude`, center.lng);
      changed |= sendSignal(`zoom`, zoom);

      if (changed || force) {
        return view.runAsync();
      }
      return 0;
    }).then(this.enableSignals, this.enableSignals);
  },

  /**
   Inject signals into the spec
   */
  _updateGraphSpec: function (spec) {
    this._vsi.overrideField(spec, `padding`, 0);
    this._vsi.overrideField(spec, `autosize`, `none`);
    this._vsi.addToList(spec, `signals`, [`zoom`, `latitude`, `longitude`]);
    this._vsi.addToList(spec, `projections`, [{
      name: `projection`,
      type: `mercator`,
      scale: {signal: `256*pow(2,zoom)/2/PI`},
      rotate: [{signal: `-longitude`}, 0, 0],
      center: [0, {signal: `latitude`}],
      translate: [{signal: `width/2`}, {signal: `height/2`}]
    }]);

    return spec;
  }

});

L.VegaLayer.version = version;
