// Node
const Readline = require('readline')
const Url = require('url')
const Path = require('path')
// 3rd
const gulp = require('gulp')
const rimraf = require('rimraf')
const program = require('commander')
// 1st
const Crawler = require('./crawler')

program
  .option('--port <port>', 'server is listening on localhost', (str) => Number.parseInt(str, 10) || 3000, 3000)
  .option('--concurrency <n>', 'max number of in-flight requests', (str) => Number.parseInt(str, 10) || 8, 8)
  .option('--public <folder>', 'name of public folder', 'public')
  .parse(process.argv)

// READLINE

const readline = Readline.createInterface({
  input: process.stdin,
  terminal: false
})


// GULP

module.exports = function ({ port = program.port, concurrency = program.concurrency, public = program.concurrency } = {}) {
  const crawler = new Crawler({port, concurrency})

  readline.on('line', function (line) {
    const route = Url.parse(line).pathname
    crawler.push(route)
  })

  readline.on('close', () => {
    crawler.end()
  })

  crawler.stream.on('error', (err) => {
    console.error('Bailing because of error:', err.message)
    process.exit(1)
  })

  crawler.stream.on('end', () => {
    console.log('Website generated in the ./build folder')
  })

  gulp.task('clean', (cb) => {
    return rimraf('build', cb)
  })

  gulp.task('copy', ['clean'], () => {
    const publicPath = Path.resolve(process.cwd(), program.public)
    console.log('Static assets copied from:', publicPath)
    return gulp.src(publicPath + '/**', { follow: true })
      .pipe(gulp.dest('build'))
  })

  gulp.task('default', ['copy'], () => {
    return crawler.stream
      .pipe(gulp.dest('build'))
  })

  gulp.start()
}
