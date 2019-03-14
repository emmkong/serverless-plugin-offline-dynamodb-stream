module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'usage',
        shippedProposals: true,
        targets: {
          node: '8.10',
        },
      },
    ],
  ],
  plugins: [
    '@babel/plugin-transform-flow-strip-types',
    '@babel/plugin-proposal-class-properties',
    /**
     * babel-plugin-root-import should be at the end,
     * src/webpack.default.config removes this plugin
     * in favour of an alias because there troubles with this
     * plugin and subdirectories.
     */
    [
      'babel-plugin-root-import',
      {
        rootPathSuffix: './src',
        rootPathPrefix: '~',
      },
    ],
  ],
};
