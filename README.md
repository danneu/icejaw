<div align="center">
  <img src="/skull.png" alt="skull">
</div>

<p align="center">
  Generate a static website from a dynamic one.
</p>

# icejaw [![Build Status](https://travis-ci.org/danneu/icejaw.svg?branch=master)](https://travis-ci.org/danneu/icejaw) [![NPM version](https://badge.fury.io/js/icejaw.svg)](http://badge.fury.io/js/icejaw) [![Dependency Status](https://david-dm.org/danneu/icejaw.svg)](https://david-dm.org/danneu/icejaw)

Icejaw is a general tool like `wget -r` that can crawl a stream of urls
and spit out a 100% static, ready-to-deploy website in the designated folder.

This way you can develop your static site with whatever dynamic technology
you're already familiar with instead of credentializing in a more limited
static-site-generator that may not be able to do what you want.

## Install

    npm install --global icejaw

## Usage

Icejaw expects a `\n`-delimited list of routes.

    /
    /users
    /users/1
    /users/2
    /faq

Pipe them into icejaw's stdin:

    cat routes.txt | icejaw


Icejaw will send a GET request to each one and save the HTML
response into the `./build` directory.

Icejaw only cares about the path. `/hello` is equivalent to
`https://example.com/hello`. For example, your `sitemap.txt`
file might be sufficient if you have one.

Query-strings are ignored. `/hello?foo=1` and `/hello?foo=bar`
are both considered `/hello`, and only the first instance will
trigger a crawl.

    $ node server.js
    Express is listening on http://localhost:3000

    $ cat sitemap.txt | icejaw --port 3000
    200 /        -> ./build/index.html
    200 /users   -> ./build/users.html
    200 /users/1 -> ./build/users/1.html
    200 /users/2 -> ./build/users/2.html
    200 /users/3 -> ./build/users/3.html

    $ tree build
    build
    ├── index.html
    ├── test.jpg
    ├── users.html
    └── users
        ├── 1.html
        ├── 2.html
        └── 3.html

## CLI Options

- `--port <Integer>`: The localhost post that the server is running on.
  - Default: `3000`
- `--concurrency <Integer>`: The number of in-flight requests to localhost
  allowed at a time.
  - Default: `8`
- `--assets <String>`: Path to the folder containing static assets to
  be copied to the build. May be absolute or relative to current directory.
  - Default: `./public`
- `--out <String>`: Path to the generated build folder.
  May be absolute or relative to current directory.
  - Default: `./build`
- `--routes <String>`: Comma-delimited list of routes.
  Useful for testing/sanity-checking.
  If this is set, then stdin will be ignored.
  - Example: `--routes "/,/foo,/bar"`
- `--ignore404`: If this flag is set, icejaw won't stop freezing when
  it encounters a 404 response. Instead, it will print a warning to
  stdout and move on. No static page will be generated for the route.
  - Default: `false`
- `--redirect [strategy]`: is one of `follow`, `ignore`, `error`.
  - Default: `follow`

## Static Assets

By default, icejaw assumes your static assets are contained in a top-level
folder named "public", and it will copy all of its contents into the build folder.

## Trailing Backslash

Whether a route ends in a backslash is an important distinction.

- `/example` gets written to `/example.html`
- `/example/path` gets written to `/example/path.html`
- `/example/` gets written to `/example/index.html`
- `/example/path/` gets written to `/example/path/index.html`

This is consistent with, for example, how <https://surge.sh> implements
clean URL redirection (https://surge.sh/help/using-clean-urls-automatically).

## Route Generation

You generally need to query your database to generate a list of routes.

This part is up to you. If you simply print routes to stdout, then you can
pipe the result directly into icejaw.

Print out routes as soon as you have them so icejaw can consume them
faster.

``` javascript
// generate.js

const Promise = require('bluebird')

['/', '/users', '/faq', '/about-us'].forEach((route) => console.log(route))

Promise.try(() => {
  return db.getAllUserIds()
}).then((ids) => {
  ids.forEach((id) => console.log(`/users/${id}`))
}).catch((err) => {
  console.error(err)
  process.exit(1)
})

```

    node generate.js | icejaw

## Programmatic Usage (WIP)

*I'm not sure how this API should look, yet. I currently only use it for
testing. Ideally you would be able to pipe stuff into icejaw and customize
icejaw's output with gulp plugins.*

Icejaw takes an options object that's similar to the CLI API
with the same defaults. It returns a promise.

Upon success, the promise resolves into an object that has all
of the options but also stats `pathCount`, `fileCount`.

``` javascript
const icejaw = require('icejaw')

icejaw({
  port: 5000,
  out: './build',
  assets: './assets',
  concurrency: 8,
  routes: ['/', '/users', '/faq']
}).then(() => {
  console.log('done')
}).catch((err) => {
  console.error(err)
})
```
