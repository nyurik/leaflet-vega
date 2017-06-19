'use strict';

/*global L*/

L.vegaLayer = function (spec) {
  return new L.VegaLayer(spec);
};

L.VegaLayer = (L.Layer ? L.Layer : L.Class).extend({

  options: {
    // FIXME: uses window.vega
    vega: window && window.vega,

    // If true, graph will be repainted only after the map has finished moving
    delayRepaint: true,

    // Options to be passed to the Vega's parse method
    parseConfig: undefined,

    // Options to be passed ot the Vega's View constructor
    viewConfig: undefined,
  },

  initialize: function (spec, options) {
    this._spec = this._updateGraphSpec(spec);
    L.Util.setOptions(this, options);
  },

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

    this._view = new vega.View(dataflow, this.options.viewConfig)
      .logLevel(vega.Warn)
      .renderer('canvas')
      .padding({left: 0, right: 0, top: 0, bottom: 0})
      .initialize(this._vegaContainer)
      .hover();

    this._view.addSignalListener('latitude', (name, value) => this._onSignalChange(name, value));
    this._view.addSignalListener('longitude', (name, value) => this._onSignalChange(name, value));
    this._view.addSignalListener('zoom', (name, value) => this._onSignalChange(name, value));

    this._reset();

    map.on(this.options.delayRepaint ? 'moveend' : 'move', () => this._reset());
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
  _updateGraphSpec: function (spec) {
    /*
    Find all names that are not defined in the spec's section
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

    /*
     Set spec field, and warn if overriding
      */
    function overrideField(spec, name, value) {
      if (spec[name] && spec[name] !== value) {
        console.log(`Overriding ${name} 𐃘 ${value}`);
      }
      spec[name] = value;
    }

    const mapSignals = ['zoom', 'zoomscale', 'latitude', 'longitude'];
    for (let sig of findUndefined(spec, 'signals', mapSignals)) {
      spec.signals.push({name: sig});
    }

    for (let prj of findUndefined(spec, 'projections', ['projection'])) {
      spec.projections.push({
        name: prj,
        type: 'mercator',
        scale: {signal: 'zoomscale'},
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
