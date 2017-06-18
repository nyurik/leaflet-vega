L = require('leaflet');
Vega = require('vega');

L.vegaLayer = function (spec) {
  return new L.VegaLayer(spec);
};

L.VegaLayer = (L.Layer ? L.Layer : L.Class).extend({

  initialize: function (spec) {
    this._injectSpecSignals(spec);
    this._spec = spec;
    L.Util.setOptions(this, {});
  },

  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  onAdd: function (map) {
    this._map = map;
    this._vegaContainer = L.DomUtil.create('div', 'someclass');
    map._panes.overlayPane.appendChild(this._vegaContainer);

    this._view = new Vega.View(Vega.parse(this._spec))
      .logLevel(Vega.Warn)
      .renderer('canvas')
      .padding({left: 0, right: 0, top: 0, bottom: 0})
      .initialize(this._vegaContainer)
      .hover();

    this._view.addSignalListener('latitude', (name, value) => this._onSignalChange(name, value));
    this._view.addSignalListener('longitude', (name, value) => this._onSignalChange(name, value));
    this._view.addSignalListener('zoom', (name, value) => this._onSignalChange(name, value));

    this._reset();

    map.on('moveend', () => this._reset());
    map.on('zoomend', () => this._reset());
  },

  onRemove: function () {
    this._view.finalize();
    L.DomUtil.empty(this._vegaContainer);
  },

  _onSignalChange: function (name, value) {
    const map = this._map;
    let center = map.getCenter();
    let zoom = map.getZoom();

    switch (name) {
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

  _reset: function () {

    const map = this._map;
    const view = this._view;

    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._vegaContainer, topLeft);

    const size = map.getSize();
    const center = map.getCenter();
    const zoom = map.getZoom();

    // 256 is the tile size in pixels. The world's width is (256 * 2^zoom)
    // d3 mercator scaling is (world / 2 / PI)
    const zoomscale = 256 * Math.pow(2, zoom) / 2 / Math.PI;

    if (view.signal('width') !== size.x) view.signal('width', size.x);
    if (view.signal('height') !== size.y) view.signal('height', size.y);
    if (view.signal('latitude') !== center.lat) view.signal('latitude', center.lat);
    if (view.signal('longitude') !== center.lng) view.signal('longitude', center.lng);
    if (view.signal('zoom') !== zoom) view.signal('zoom', zoom);
    if (view.signal('zoomscale') !== zoomscale) view.signal('zoomscale', zoomscale);

    view.run();
  },

  /*
   Inject signals into the spec
   TODO: make it less hacky - avoid spec modification
   */
  _injectSpecSignals: function (spec) {
    if (!spec.signals) {
      spec.signals = [];
    } else if (!Array.isArray(spec.signals)) {
      throw Error('signals must be an array');
    }
    const signals = new Set(['zoom', 'zoomscale', 'latitude', 'longitude']);
    for (let sig of spec.signals) {
      if (sig.name) signals.delete(sig.name);
    }
    for (let sig of signals) {
      spec.signals.push({name: sig});
    }
  }

});
