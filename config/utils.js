const path = require('path')

exports.resolve = function resolve (dir) {
  return path.join(__dirname, '..', dir)
}

exports.APP_PATH = exports.resolve('src')
exports.DIST_PATH = exports.resolve('dist')

exports.getWeebpackResolveConfig = function (coustomAlias = {}) {
  const appPatch = exports.APP_PATH
  return {
    modules: [appPatch, 'node_modules'],
    extensions: ['.js', '.json'],
    alias: {
      '@': appPatch,
      ...coustomAlias
    }
  }
}
