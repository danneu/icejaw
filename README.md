
![skull](skull.png)

# icejaw

[![Build Status](https://travis-ci.org/danneu/icejaw.svg?branch=master)](https://travis-ci.org/danneu/icejaw)
[![NPM version](https://badge.fury.io/js/icejaw.svg)](http://badge.fury.io/js/icejaw)
[![Dependency Status](https://david-dm.org/danneu/icejaw.svg)](https://david-dm.org/danneu/icejaw)

Generate a static website from a dynamic one.

Icejaw consumes a stream of localhost routes on stdin, crawls them
concurrently, and spits the results into a `./build` folder.

It's hopefully a more useful/configurable `wget -r`.

## Install

    npm install --global icejaw

## Usage

Pipe a `\n`-delimited list of routes to icejaw. Icejaw will send a GET
request to each one and save the HTML response in the "build" directory.
If any response is not a 200, icejaw will exit with an error.

Icejaw only cares about the path. `/hello` is equivalent to
`https://example.com/hello`.

Icejaw will generate a `./build` folder.

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

## Options

- `--port <Integer>`: The localhost post that the server is running on. Default: 3000.
- `--concurrency <Integer>`: The number of in-flight requests to localhost allowed at a time. Default: 8.
- `--public <String>`: Path to the folder containing static assets to be copied to the build. Maybe be absolute or relative to CWD. Default: "public".

## Static assets

By default, icejaw assumes your static assets are contained in a top-level
folder named "public", and it will copy all of its contents into the build folder.

## Trailing backslash

Whether a route ends in a backslash is an important distinction.

- `/example` gets written to `/example.html`
- `/example/path` gets written to `/example/path.html`
- `/example/` gets written to `/example/index.html`
- `/example/path/` gets written to `/example/path/index.html`

This is consistent with, for example, how <https://surge.sh> implements
clean URL redirection (https://surge.sh/help/using-clean-urls-automatically).

## Route generation

You generally need to query your database to generate a list of routes.

This part is up to you. If you simply print routes to stdout, then you can
pipe the result directly into icejaw.

``` javascript
// generate.js

const Promise = require('bluebird')

;[
  '/',
  '/users'
].forEach((route) => console.log(route))

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
