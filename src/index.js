
// Node
const Url = require('url')
const Path = require('path')
// 3rd
const es = require('event-stream')
const program = require('commander')
const rimraf = require('rimraf')
const gulp = require('gulp')
// 1st
const crawler = require('./crawler')

program
  .version(require('../package.json').version)
  .option('--port <port>', 'server is listening on localhost', (str) => Number.parseInt(str, 10) || 3000, 3000)
  .option('--concurrency <n>', 'max number of in-flight requests', (str) => Number.parseInt(str, 10) || 8, 8)
  .option('--assets <folder>', 'name of public/assets folder', 'public')
  .option('--routes <routes>', '(for testing) comma-delimited routes', (str) => str.split(','))
  .option('--out <folder>', 'path to build folder', 'build')
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


module.exports = function ({ port = program.port, concurrency = program.concurrency, assets = program.assets, routes = program.routes, out = program.out } = {}) {
  const outPath = Path.resolve(process.cwd(), out)
  const publicPath = Path.resolve(process.cwd(), assets)

  gulp.task('clean', (cb) => {
    return rimraf(outPath, cb)
  })

  gulp.task('copy', ['clean'], () => {
    console.log('Static assets copied from:', publicPath)
    return gulp.src(publicPath + '/**', { follow: true })
      .pipe(gulp.dest(outPath))
  })

  gulp.task('default', ['copy'], () => {
    let routeStream
    if (Array.isArray(routes)) {
      routeStream = es.readArray(routes)
    } else {
      routeStream = process.stdin.pipe(es.split())
    }
    const stream = routeStream
      .pipe(dropEmpty())
      .pipe(intoPaths())
      .pipe(crawler({ port, concurrency }))

    stream.on('error', (err) => {
      console.error('Bailing because of an error:', err.message)
      process.exit(1)
    })

    return stream.pipe(gulp.dest(outPath))
  })

  gulp.start()
}
