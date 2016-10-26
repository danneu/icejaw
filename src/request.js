const Url = require('url')
// 3rd
const fetch = require('isomorphic-fetch')
const File = require('vinyl')
const chalk = require('chalk')


// Returns a promise that resolves into a Vinyl file
// rejects on non-200 responses
function request (url) {
  const route = Url.parse(url).pathname
  return fetch(url)
    .then((response) => {
      if (response.status !== 200) {
        console.error(`${chalk.red(response.status)} ${route}`)
        throw new Error(`<${url}> did not respond with 200`)
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


module.exports = request
