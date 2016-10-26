// Node
const Stream = require('stream')
// 3rd
const fetch = require('isomorphic-fetch')
const File = require('vinyl')
const chalk = require('chalk')
const queue = require('promise-task-queue')

function Crawler ({ port, concurrency } = {}) {
  this.stream = new Stream.Readable({ objectMode: true })
  this.stream._read = function noop () {}
  this.localhost = `http://localhost:${port}`
  this.enqueued = 0
  this.endEnqueued = false
  this.queue = queue()
  this.queue.define('request', ({route}) => {
    return this.request(route)
      .catch((err) => this.stream.emit('error', err))
      .then((file) => this.stream.push(file))
  }, { concurrency })
  this.queue.on('finished:request', () => {
    this.enqueued -= 1
    if (this.endEnqueued && this.enqueued === 0) {
      this.stream.emit('end')
    }
  })
}

// Signals to crawler that no more routes will be read from stdin
// and it should close the stream once its queue is drained
Crawler.prototype.end = function () {
  this.endEnqueued = true
}

Crawler.prototype.push = function (route) {
  this.enqueued += 1
  return this.queue.push('request', { route })
}

Crawler.prototype.request = function (route) {
  return fetch(this.localhost + route)
    .then((response) => {
      if (response.status !== 200) {
        console.error(`${chalk.red(response.status)} ${route}`)
        throw new Error(`"${route}" did not respond with 200`)
      }
      return response.text()
    })
    .then((text) => {
      const contents = Buffer.from(text)
      let path = route
      if (path.endsWith('/')) {
        path += 'index'
      }
      path += '.html'
      console.log(`${chalk.green(200)} ${route} ${chalk.grey('->')} ${path}`)
      const file = new File({
        cwd: '/',
        base: '/',
        path,
        contents
      })
      return file
    })
}

module.exports = Crawler
