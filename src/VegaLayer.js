L = require('leaflet');
Vega = require('vega');

L.vegaLayer = function (spec) {
  return new L.VegaLayer(spec);
};

L.VegaLayer = (L.Layer ? L.Layer : L.Class).extend({

  initialize: function (spec) {

    // Inject signals into the spec.  TODO: make it less hacky - avoid spec modification
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
    // this._map._container.appendChild(this._vegaContainer);
    map._panes.overlayPane.appendChild(this._vegaContainer);

    const size = this._map.getSize();

    this._view = new Vega.View(Vega.parse(this._spec, {signals:{center:2, zoom:1}}), {signals:{center:null, zoom:0}})
      .logLevel(Vega.Warn)
      .renderer('canvas')
      .padding({left: 0, right: 0, top: 0, bottom: 0})
      .initialize(this._vegaContainer)
      .hover();
    this._reset();

    map.on('moveend', () => {
      this._reset();
    });

    map.on('zoomend', () => {
      this._reset();
    });
  },

  onRemove: function (map) {
    // FIXME: TODO
  },

  _reset: function () {
    const topLeft = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._vegaContainer, topLeft);

    const size = this._map.getSize();
    const center = map.getCenter();
    const zoom = map.getZoom();

    // 256 is the tile size. The world's width is (256 * 2^zoom)
    // d3 mercator scaling is (world / 2 / PI)
    const scale = 256 * Math.pow(2, zoom) / 2 / Math.PI;

    this._view
      .width(size.x)
      .height(size.y)
      .signal('latitude', center.lat)
      .signal('longitude', center.lng)
      .signal('zoom', zoom)
      .signal('zoomscale', scale)
      .run();
  },

});

