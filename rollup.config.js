import json from 'rollup-plugin-json';
import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

const pkg = require('./package.json');

const copyright = `/* ${pkg.name} - v${pkg.version} - ${new Date().toString()}
 * Copyright (c) ${new Date().getFullYear()} ${pkg.author} 
 * ${pkg.license} */`;


export default {
  input: 'src/VegaLayer.js',
  name: 'L.vega',
  external: ['leaflet'],
  output: {
    file: 'dist/bundle.js',
    format: 'umd'
  },
  plugins: [
    nodeResolve(),
    json(),
    babel({
      exclude: 'node_modules/**'
    })
  ],
  globals: {
    leaflet: 'L',
    'leaflet-vega': 'L.vega'
  },
  sourcemap: true,
  banner: copyright,
  legacy: true // Needed to create files loadable by IE8
};
