const Url = require('url')
const Path = require('path')
// 3rd
const Promise = require('bluebird')
const fetch = require('node-fetch')
const File = require('vinyl')
const chalk = require('chalk')
const createError = require('create-error')

// Redirects become RedirectError
// Every other non-200 response becomes NotOkError

const NotOkError = createError('NotOkError', {
    status: null,
})

const RedirectError = createError('RedirectError', {
    status: null,
    location: null,
})

const REDIRECT_CODES = [301, 302, 303, 307, 308]

// Returns a promise that resolves into a Vinyl file
// rejects on non-200 responses
module.exports = function request(
    url,
    { ignore404 = false, redirect = 'follow' } = {}
) {
    let route = Url.parse(url).pathname
    return Promise.try(() => {
        return fetch(url, {
            // node-fetch's redirect key is one of follow | error | manual
            //
            // Ours        Theirs
            // follow  ->  follow
            // ignore  ->  manual
            // error   ->  manual
            redirect: redirect === 'follow' ? 'follow' : 'manual',
        })
    })
        .then(response => {
            if (!REDIRECT_CODES.includes(response.status)) return response
            // redirect must be ignore or error, so throw an error so we catch
            // handle it at the end
            const location = response.headers.get('location')
            throw new RedirectError(`Redirect from ${route} -> ${location}`, {
                location: response.headers.get('location'),
                status: response.status,
            })
        })
        .then(response => {
            if (response.status !== 200) {
                console.error(`${chalk.red(response.status)} ${route}`)
                throw new NotOkError(
                    `<${route}> responded with ${response.status}`,
                    {
                        status: response.status,
                    }
                )
            }
            return response.buffer()
        })
        .then(contents => {
            let path = route
            if (path.endsWith('/')) path += 'index.html'
            if (!Path.extname(path)) path += '.html'
            console.log(
                `${chalk.green(200)} ${route} ${chalk.grey('->')} ${path}`
            )
            return new File({ cwd: '/', base: '/', path, contents })
        })
        .catch(err => {
            if (err instanceof NotOkError && err.status === 404 && ignore404) {
                // handle 404
                return console.log(
                    `${chalk.yellow('ignoring')} ${chalk.red(404)} ${route}`
                )
            } else if (err instanceof RedirectError && redirect === 'ignore') {
                return console.log(
                    `${chalk.yellow('ignoring')} ${chalk.grey(err.status)} ${
                        route
                    }`
                )
            } else {
                throw err
            }
        })
}
