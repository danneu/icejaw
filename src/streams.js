
const Url = require('url')
// 3rd
const es = require('event-stream')

//
// General stream helpers
//


// passes everything through
exports.identity = function () {
  return es.map((data, cb) => {
    cb(null, data)
  })
}


// Executes fn(data) for each item that passes through
// Not meant to mutate data, but do something else with
// side-effects.
exports.tap = function (fn) {
  return es.map((data, cb) => {
    fn(data)
    cb(null, data)
  })
}


// Trims chunks and ignores empty strings
exports.dropEmpty = function () {
  return es.map((data, cb) => {
    data = data.trim()
    if (data.length === 0) return cb()
    cb(null, data)
  })
}


// /foo -> /foo
// http://example.com/foo -> /foo
exports.intoPaths = function () {
  return es.map((data, cb) => {
    cb(null, Url.parse(data).pathname)
  })
}


// Only emits the first occurrence of each value it sees
exports.dropDupes = function () {
  const seen = new Set()

  return es.map((data, cb) => {
    if (seen.has(data)) return cb()
    seen.add(data)
    cb(null, data)
  })
}
