const path = require('path');

module.exports  = {
    entry: {
        index: './index.js'
    },
    output: {
        filename: '[name].min.js',
        path: __dirname
    },

    module:{
        rules:[
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                  loader: 'babel-loader',
                  options: {
                    presets: ['@babel/preset-env']
                  }
                }
            }
        ]
    }
}