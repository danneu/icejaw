
// Node
const Url = require('url')
const Path = require('path')
// 3rd
const assert = require('better-assert')
const es = require('event-stream')
const program = require('commander')
const rimraf = require('rimraf')
const Orchestrator = require('orchestrator')
const vfs = require('vinyl-fs')
const Promise = require('bluebird')
const debug = require('debug')('icejaw')
// 1st
const crawler = require('./crawler')

program
  .version(require('../package.json').version)
  .option('--port <port>', 'server is listening on localhost', (str) => Number.parseInt(str, 10) || 3000, 3000)
  .option('--concurrency <n>', 'max number of in-flight requests', (str) => Number.parseInt(str, 10) || 8, 8)
  .option('--assets <folder>', 'name of public/assets folder', 'public')
  .option('--routes <routes>', '(for testing) comma-delimited routes', (str) => str.split(','))
  .option('--out <folder>', 'path to build folder', 'build')
  .option('--ignore404', 'icejaw will ignore 404s instead of exiting the process')
  .option('--redirect [strategy]', 'should icejaw "follow", "ignore", or throw "error" on redirects?', 'follow')
  .parse(process.argv)


// Trims chunks and ignores empty strings
function dropEmpty () {
  return es.map((data, cb) => {
    data = data.trim()
    if (data.length === 0) return cb()
    cb(null, data)
  })
}


// /foo -> /foo
// http://example.com/foo -> /foo
function intoPaths () {
  return es.map((data, cb) => {
    cb(null, Url.parse(data).pathname)
  })
}


module.exports = function ({ port = program.port, concurrency = program.concurrency, assets = program.assets, routes = program.routes, out = program.out, ignore404 = !!program.ignore404, redirect = program.redirect } = {}) {
  return Promise.try(() => {
    assert(Number.isInteger(port))
    assert(Number.isInteger(concurrency))
    assert(typeof routes === 'undefined' || Array.isArray(routes))
    assert(typeof out === 'string')
    assert(typeof assets === 'string')
    assert(typeof ignore404 === 'boolean')
    assert(['follow', 'ignore', 'error'].includes(redirect))

    const outPath = Path.resolve(process.cwd(), out)
    const publicPath = Path.resolve(process.cwd(), assets)

    let onResolve, onReject
    const deferredPromise = new Promise((resolve, reject) => {
      onResolve = resolve
      onReject = reject
    })

    const orchestrator = new Orchestrator()

    orchestrator.task('clean', (cb) => {
      return rimraf(outPath, cb)
    })

    orchestrator.task('copy', ['clean'], () => {
      debug(`Static assets copied from ${publicPath} -> ${outPath}`)
      return vfs.src(publicPath + '/**', { follow: true })
        .pipe(vfs.dest(outPath))
    })

    orchestrator.task('default', ['copy'], () => {
      let routeStream
      if (Array.isArray(routes)) {
        routeStream = es.readArray(routes)
      } else {
        routeStream = process.stdin.pipe(es.split())
      }
      const stream = routeStream
        .pipe(dropEmpty())
        .pipe(intoPaths())
        .pipe(crawler({ port, concurrency, ignore404, redirect }))

      stream.on('error', (err) => onReject(err))

      return stream.pipe(vfs.dest(outPath))
    })

    orchestrator.on('err', (err) => onReject(err))
    orchestrator.on('stop', () => onResolve())
    orchestrator.start((err) => err ? onReject(err) : onResolve())

    return deferredPromise
  })
}
