const path = require('path');

module.exports = {
  entry: {
    content: './src/content-ai.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    fallback: {
      "path": false,
      "fs": false
    }
  },
  mode: 'production'
};