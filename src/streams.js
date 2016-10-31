
const Url = require('url')
// 3rd
const es = require('event-stream')

//
// General stream helpers
//


// Executes fn() for each item that passes through
// Doesn't mutate the items.
function forEach (fn) {
  return es.map((data, cb) => {
    fn()
    cb(null, data)
  })
}


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


// Only emits the first occurrence of each value it sees
function dropDupes () {
  const seen = new Set()

  return es.map((data, cb) => {
    if (seen.has(data)) return cb()
    seen.add(data)
    cb(null, data)
  })
}


module.exports = {
  dropEmpty,
  intoPaths,
  dropDupes,
  forEach
}
