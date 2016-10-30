const Url = require('url')
const Path = require('path')
// 3rd
const Promise = require('bluebird')
const fetch = require('node-fetch')
const File = require('vinyl')
const chalk = require('chalk')


// Returns a promise that resolves into a Vinyl file
// rejects on non-200 responses
module.exports = function request (url) {
  let route = Url.parse(url).pathname
  return Promise.try(() => {
    return fetch(url)
  }).then((response) => {
    if (response.status !== 200) {
      console.error(`${chalk.red(response.status)} ${route}`)
      throw new Error(`<${url}> did not respond with 200`)
    }
    return response.buffer()
  }).then((contents) => {
    let path = route
    if (path.endsWith('/')) path += 'index.html'
    if (!Path.extname(path)) path += '.html'
    console.log(`${chalk.green(200)} ${route} ${chalk.grey('->')} ${path}`)
    return new File({ cwd: '/', base: '/', path, contents })
  })
}
