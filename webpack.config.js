const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = {
  mode: 'production',
  devtool: false,
  entry: {
    scrapingScript: './src/content/scrapingScript.ts',
    popup: './src/popup/popup.ts',
    background: './src/background/background.ts',
    offscreen: './src/offscreen/offscreen.ts',
    micsetup: './src/micsetup/micsetup.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  resolve: { extensions: ['.ts', '.js'] },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json',                to: 'manifest.json' },
        { from: 'src/popup/popup.html',         to: 'popup.html' },
        { from: 'src/popup/popup.css',          to: 'popup.css' },
        { from: 'src/offscreen/offscreen.html', to: 'offscreen.html', noErrorOnMissing: true },
        { from: 'src/micsetup/micsetup.html',   to: 'micsetup.html' },
        { from: 'src/micsetup/micsetup.css',    to: 'micsetup.css' },
        { from: 'src/assets',                   to: 'assets' },
      ]
    })
  ]
}
