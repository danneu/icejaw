const Url = require('url')
const Path = require('path')
// 3rd
const Promise = require('bluebird')
const fetch = require('node-fetch')
const File = require('vinyl')
const chalk = require('chalk')
const createError = require('create-error')


const NotOkError = createError('NotOkError', {
  status: null
})


// Returns a promise that resolves into a Vinyl file
// rejects on non-200 responses
module.exports = function request (url, {ignore404 = false} = {}) {
  let route = Url.parse(url).pathname
  return Promise.try(() => {
    return fetch(url)
  }).then((response) => {
    if (response.status !== 200) {
      console.error(`${chalk.red(response.status)} ${route}`)
      throw new NotOkError(`<${route}> responded with ${response.status}`, {
        status: response.status
      })
    }
    return response.buffer()
  }).then((contents) => {
    let path = route
    if (path.endsWith('/')) path += 'index.html'
    if (!Path.extname(path)) path += '.html'
    console.log(`${chalk.green(200)} ${route} ${chalk.grey('->')} ${path}`)
    return new File({ cwd: '/', base: '/', path, contents })
  }).catch((err) => {
    if (err instanceof NotOkError && err.status === 404 && ignore404) {
      return console.warn(`Ignored 404 url: ${url}`)
    } else {
      throw err
    }
  })
}
