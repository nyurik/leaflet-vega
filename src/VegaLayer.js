L = require('leaflet');
Vega = require('vega');

L.vegaLayer = function (spec) {
  return new L.VegaLayer(spec);
};

L.VegaLayer = (L.Layer ? L.Layer : L.Class).extend({

  initialize: function (spec) {
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

    this._view = new Vega.View(Vega.parse(this._spec), {})
      .logLevel(Vega.Warn)
      .renderer('canvas')
      .padding({left: 0, right: 0, top: 0, bottom: 0})
      .initialize(this._vegaContainer/*, size.x, size.y*/)
      .width(600)
      .height(600)
      .hover()
      .run();

    map.on('moveend', () => {
      this._view
        .signal('center', map.getCenter())
        .run();
    });

    map.on('zoomend', () => {
      this._view
        .signal('zoom', map.getZoom())
        .run();
    });
  },

  onRemove: function (map) {
    // FIXME: TODO
  },

  // From: https://github.com/Leaflet/Leaflet.heat/blob/gh-pages/src/HeatLayer.js
  // _reset: function () {
  //   var topLeft = this._map.containerPointToLayerPoint([0, 0]);
  //   L.DomUtil.setPosition(this._canvas, topLeft);
  //
  //   var size = this._map.getSize();
  //
  //   if (this._heat._width !== size.x) {
  //     this._canvas.width = this._heat._width  = size.x;
  //   }
  //   if (this._heat._height !== size.y) {
  //     this._canvas.height = this._heat._height = size.y;
  //   }
  //
  //   this._redraw();
  // },

});

