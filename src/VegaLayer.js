import {version} from '../package.json';
import L from 'leaflet';

L.vega = function (spec, options) {
  return new L.VegaLayer(spec, options);
};

L.VegaLayer = (L.Layer ? L.Layer : L.Class).extend({

  options: {
    // FIXME: uses window.vega
    vega: window && window.vega,

    // Options to be passed to the Vega's parse method
    parseConfig: undefined,

    // Options to be passed ot the Vega's View constructor
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

  onAdd: function (map) {
    this._map = map;
    this._vegaContainer = L.DomUtil.create('div', 'leaflet-vega-container');
    map._panes.overlayPane.appendChild(this._vegaContainer);

    const vega = this.options.vega;

    const dataflow = vega.parse(this._spec, this.options.parseConfigp);

    this._view = new vega.View(dataflow, this.options.viewConfig);

    if (this.options.onWarning) {
      this._view.warn = this._onWarn;
    }

    if (this.options.onError) {
      this._view.error = this._onError;
    }

    this._view
      .padding({left: 0, right: 0, top: 0, bottom: 0})
      .initialize(this._vegaContainer)
      .hover();

    const onSignal = (sig, value) => this._onSignalChange(sig, value);

    this._view
      .addSignalListener('latitude', onSignal)
      .addSignalListener('longitude', onSignal)
      .addSignalListener('zoom', onSignal);

    this._reset(true);

    map.on(this.options.delayRepaint ? 'moveend' : 'move', () => this._reset());
    map.on('zoomend', () => this._reset());
  },

  onRemove: function () {
    this._view.finalize();
    L.DomUtil.empty(this._vegaContainer);
  },

  _onSignalChange: function (sig, value) {
    const map = this._map;
    let center = map.getCenter();
    let zoom = map.getZoom();

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
    this._reset();
  },

  _reset: function (force) {

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

    // Only send changed signals to Vega
    let changed = 0;
    changed |= sendSignal('width', size.x);
    changed |= sendSignal('height', size.y);
    changed |= sendSignal('latitude', center.lat);
    changed |= sendSignal('longitude', center.lng);
    changed |= sendSignal('zoom', zoom);

    if (changed || force) view.run();
  },

  /*
   Inject signals into the spec
   TODO: make it less hacky - avoid spec modification
   */
  _updateGraphSpec: function (spec) {
    /**
     * Find all names that are not defined in the spec's section
     * @param {object} spec
     * @param {string} section
     * @param {Iterable.<string>} names
     * @return {Iterable.<string>}
     */
    function findUndefined(spec, section, names) {
      if (!spec.hasOwnProperty(section)) {
        spec[section] = [];
        return names;
      } else if (!Array.isArray(spec[section])) {
        throw new Error('signals must be an array');
      }

      names = new Set(names);
      for (let obj of spec[section]) {
        // If obj has a name field, delete that name from the names
        // Set will silently ignore delete() for undefined names
        if (obj.name) names.delete(obj.name);
      }
      return names;
    }

    /**
     * Set spec field, and warn if overriding
     * @param {object} spec
     * @param {string} key
     * @param {*} value
     */
    function overrideField(spec, key, value) {
      if (spec[key] && spec[key] !== value) {
        console.log(`Overriding ${key} 𐃘 ${value}`);
      }
      spec[key] = value;
    }

    const mapSignals = ['zoom', 'latitude', 'longitude'];
    for (let sig of findUndefined(spec, 'signals', mapSignals)) {
      spec.signals.push({name: sig});
    }

    for (let prj of findUndefined(spec, 'projections', ['projection'])) {
      spec.projections.push({
        name: prj,
        type: 'mercator',
        scale: {signal: '256*pow(2,zoom)/2/PI'},
        rotate: [{signal: '-longitude'}, 0, 0],
        center: [0, {signal: 'latitude'}],
        translate: [{signal: 'width/2'}, {signal: 'height/2'}]
      });
    }

    overrideField(spec, 'padding', 0);
    overrideField(spec, 'autosize', 'none');

    return spec;
  }

});

L.VegaLayer.version = version;
