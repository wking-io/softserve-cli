// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// @remove-on-eject-end
'use strict';

const autoprefixer = require('autoprefixer');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const paths = require('./paths');

// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';

// Options for PostCSS as we reference these options twice
// Adds vendor prefixing based on your specified browser support in
// package.json
const postCSSLoaderOptions = {
  // Necessary for external CSS imports to work
  ident: 'postcss',
  plugins: () => [
    require('postcss-flexbugs-fixes'),
    autoprefixer({
      flexbox: 'no-2009',
    }),
    require('cssnano'),
  ],
};

const extractCommons = new webpack.optimize.CommonsChunkPlugin({
  name: 'commons',
  filename: 'commons.js',
});
const extractCSS = new ExtractTextPlugin('[name].bundle.css');

// This is the production configuration.
// It compiles slowly and is focused on producing a fast and minimal bundle.
// The development configuration is different and lives in a separate file.
module.exports = {
  // Don't attempt to continue if there are any errors.
  bail: true,
  // We generate sourcemaps in production. This is slow but gives good results.
  // You can exclude the *.map files from the build during deployment.
  devtool: shouldUseSourceMap ? 'source-map' : false,
  // In production, we only want to load the polyfills and the app code.
  entry: Object.assign(
    // We ship a few polyfills by default:
    { polyfill: paths.ownPath + 'config/polyfills' },
    // Object representing all files not in a folder in the theme src
    paths.themeEntry
  ),
  output: {
    path: paths.themeBuild,
    filename: '[name].bundle.js',
  },
  module: {
    strictExportPresence: true,
    rules: [
      // Disable require.ensure as it's not a standard language feature.
      { parser: { requireEnsure: false } },

      {
        test: /\.(js|jsx|mjs)$/,
        enforce: 'pre',
        use: [
          {
            options: {
              eslintPath: require.resolve('eslint'),
              // TODO: consider separate config for production,
              // e.g. to enable no-console and no-debugger only in production.
              baseConfig: {
                extends: [require.resolve('eslint-config-softserve')],
              },
              // @remove-on-eject-begin
              ignore: false,
              useEslintrc: false,
              // @remove-on-eject-end
            },
            loader: require.resolve('eslint-loader'),
          },
        ],
        include: paths.themeSrc,
        exclude: [/[/\\\\]node_modules[/\\\\]/],
      },
      {
        // "oneOf" will traverse all following loaders until one will
        // match the requirements. When no loader matches it will fall
        // back to the "file" loader at the end of the loader list.
        oneOf: [
          {
            test: /\.js$/,
            include: paths.themeJs,
            exclude: /node_modules/,
            use: [
              {
                loader: require.resolve('babel-loader'),
                options: {
                  presets: [
                    [
                      'env',
                      {
                        modules: false,
                        targets: {
                          browsers: ['last 2 versions', 'safari >= 7'],
                        },
                      },
                    ],
                  ],
                },
              },
            ],
          },
          {
            test: /\.scss$/,
            include: paths.themeStyles,
            use: extractCSS.extract([
              {
                loader: require.resolve('css-loader'),
                options: {
                  importLoaders: 2,
                  url: false,
                },
              },
              {
                loader: require.resolve('postcss-loader'),
                options: postCSSLoaderOptions,
              },
              require.resolve('sass-loader'),
            ]),
          },
          {
            test: /\.(jpg|png)$/,
            use: [
              {
                loader: require.resolve('url-loader'),
                options: { limit: 10000 },
              },
            ],
          },
          {
            test: /\.(eot|svg|ttf|woff|woff2|otf)$/,
            use: [
              {
                loader: require.resolve('file-loader'),
                options: { name: '[name].[ext]' },
              },
            ],
          },
        ],
      },
    ],
  },
  plugins: [
    // Minify the code.
    new UglifyJsPlugin({
      uglifyOptions: {
        ecma: 8,
        compress: {
          warnings: false,
          // Disabled because of an issue with Uglify breaking seemingly valid code:
          // https://github.com/facebook/create-react-app/issues/2376
          // Pending further investigation:
          // https://github.com/mishoo/UglifyJS2/issues/2011
          comparisons: false,
        },
        mangle: {
          safari10: true,
        },
        output: {
          comments: false,
          // Turned on because emoji and regex is not minified properly using default
          // https://github.com/facebook/create-react-app/issues/2488
          ascii_only: true,
        },
      },
      // Use multi-process parallel running to improve the build speed
      // Default number of concurrent runs: os.cpus().length - 1
      parallel: true,
      // Enable file caching
      cache: true,
      sourceMap: shouldUseSourceMap,
    }),
    new webpack.NamedModulesPlugin(),
    extractCommons,
    extractCSS,
    // Moment.js is an extremely popular library that bundles large locale files
    // by default due to how Webpack interprets its code. This is a practical
    // solution that requires the user to opt into importing specific locales.
    // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
    // You can remove this if you don't use Moment.js:
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
  ],
  // Some libraries import Node modules but don't use them in the browser.
  // Tell Webpack to provide empty mocks for them so importing them works.
  node: {
    dgram: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    child_process: 'empty',
  },
};