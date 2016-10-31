// 3rd
const queue = require('promise-task-queue')
const Promise = require('bluebird')
const es = require('event-stream')
// 1st
const request = require('./request')


//
// Crawler is a stream that reads a stream of file paths
// and writes a stream of Vinyl Files.
//


function initQueue (concurrency) {
  const q = queue()
  q.define('request', ({url, ignore404}) => {
    return request(url, {ignore404})
  }, { concurrency })
  return q
}


module.exports = function crawler ({ port = 3000, concurrency = 8, ignore404 } = {}) {
  const queue = initQueue(concurrency)
  return es.map((route, cb) => {
    const url = `http://localhost:${port}${route}`
    return Promise.try(() => queue.push('request', { url, ignore404 }))
      .then((file) => cb(null, file))
      .catch((err) => cb(err))
  })
}
