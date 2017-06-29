import json from 'rollup-plugin-json';

export default {
  entry: 'src/VegaLayer.js',
  format: 'umd',
  dest: 'dist/bundle.js',
  plugins: [json()],
  external: ['leaflet'],
  globals: {
    leaflet: 'L'
  },
  sourceMap: true,
  legacy: true // Needed to create files loadable by IE8
};
