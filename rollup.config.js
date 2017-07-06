import json from 'rollup-plugin-json';
// import nodeResolve from 'rollup-plugin-node-resolve';

const pkg = require('./package.json');

const copyright = `/* ${pkg.name} - v${pkg.version} - ${new Date().toString()}
 * Copyright (c) ${new Date().getFullYear()} ${pkg.author} 
 * ${pkg.license} */`;


export default {
  entry: 'src/VegaLayer.js',
  moduleName: 'L.vega',
  format: 'umd',
  external: ['leaflet'],
  dest: 'dist/bundle.js',
  plugins: [
    // nodeResolve({
    //   jsnext: true,
    //   main: false,
    //   browser: false,
    //   extensions: ['.js', '.json']
    // }),
    json()
  ],
  globals: {
    leaflet: 'L',
    'leaflet-vega': 'L.vega'
  },
  sourceMap: true,
  banner: copyright,
  legacy: true // Needed to create files loadable by IE8
};
