import json from 'rollup-plugin-json';
import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

const pkg = require('./package.json');

const copyright = `/* ${pkg.name} - v${pkg.version} - ${new Date().toString()}
 * Copyright (c) ${new Date().getFullYear()} ${pkg.author} 
 * ${pkg.license} */`;


export default {
  input: 'src/VegaLayer.js',
  external: ['leaflet'],
  output: {
    name: 'L.vega',
    file: 'dist/bundle.js',
    format: 'umd',
    sourcemap: true,
    banner: copyright,
    globals: {
      leaflet: 'L',
      'leaflet-vega': 'L.vega'
    },
  },
  plugins: [
    nodeResolve(),
    json(),
    babel({
      exclude: 'node_modules/**'
    })
  ],
  legacy: true // Needed to create files loadable by IE8
};
