const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const packageJson = require('./package.json');

// Custom plugin to verify version sync after build
class VersionSyncPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('VersionSyncPlugin', (compilation) => {
      const fs = require('fs');
      const manifestPath = path.resolve(__dirname, 'dist/manifest.json');

      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (manifest.version === packageJson.version) {
          console.log(`✅ Version synced: ${packageJson.version}`);
        } else {
          console.error(`❌ Version mismatch! package.json: ${packageJson.version}, manifest.json: ${manifest.version}`);
        }
      }
    });
  }
}

module.exports = {
  entry: {
    popup: './src/popup/index.tsx',
    options: './src/options/index.tsx',
    'reddit-content': './src/content/reddit/reddit.tsx',
    'devvit-content': './src/content/devvit/devvit.tsx',
    background: './src/background/index.ts',
  },
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
    publicPath: '', // Explicitly set empty publicPath for browser extensions
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new webpack.DefinePlugin({
      __VERSION__: JSON.stringify(packageJson.version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    }),
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),
    new HtmlWebpackPlugin({
      template: './public/options.html',
      filename: 'options.html',
      chunks: ['options'],
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'public/manifest.json',
          to: 'manifest.json',
          transform(content) {
            // Parse manifest, inject version from package.json, return as string
            const manifest = JSON.parse(content.toString());
            manifest.version = packageJson.version;
            return JSON.stringify(manifest, null, 2);
          },
        },
        { from: 'public/icons', to: 'icons' },
        { from: 'src/content/reddit/injected/fetchInterceptor.js', to: 'fetchInterceptor.js' },
        { from: 'src/content/reddit/injected/missionDataFetcher.js', to: 'missionDataFetcher.js' },
      ],
    }),
    new VersionSyncPlugin(),
  ],
  optimization: {
    splitChunks: false,
    minimize: false,
  },
};
