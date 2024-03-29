const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  entry: ['react-hot-loader/patch', './src/index.js'],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      src: path.resolve('./src'),
      'react-dom': '@hot-loader/react-dom',
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, '../public', 'index.html'),
      inject: 'body',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              // https://stackoverflow.com/questions/63946531/uncaught-referenceerror-regeneratorruntime-is-not-defined
              plugins: ['@babel/plugin-transform-runtime'],
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ['file-loader'],
      },
      {
        test: /\.woff($|\?)|\.woff2($|\?)|\.ttf($|\?)|\.eot($|\?)|\.svg($|\?)/,
        use: ['url-loader'],
      },
    ],
  },
};
