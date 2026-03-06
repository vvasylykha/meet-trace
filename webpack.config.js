const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  mode: 'production',
  devtool: false,
  entry: {
    scrapingScript: './src/content/scrapingScript.ts',
    popup: './src/popup/index.tsx',
    history: './src/history/index.tsx',
    background: './src/background/background.ts',
    offscreen: './src/offscreen/offscreen.ts',
    micsetup: './src/micsetup/micsetup.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  resolve: { extensions: ['.ts', '.tsx', '.js'] },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript'
            ]
          }
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ]
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({ filename: '[name].css' }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json',                to: 'manifest.json' },
        { from: 'src/popup/popup.html',         to: 'popup.html' },
        { from: 'src/history/history.html',     to: 'history.html' },
        { from: 'src/offscreen/offscreen.html', to: 'offscreen.html', noErrorOnMissing: true },
        { from: 'src/micsetup/micsetup.html',   to: 'micsetup.html' },
        { from: 'src/micsetup/micsetup.css',    to: 'micsetup.css' },
        { from: 'src/assets',                   to: 'assets' },
      ]
    })
  ]
}
