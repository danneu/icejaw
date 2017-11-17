// Node
const Path = require('path')
// 3rd
const es = require('event-stream')
const assert = require('better-assert')
const program = require('commander')
const rimraf = require('rimraf')
const Orchestrator = require('orchestrator')
const vfs = require('vinyl-fs')
const Promise = require('bluebird')
const debug = require('debug')('icejaw')
// 1st
const crawler = require('./crawler')
const streams = require('./streams')

program
    .version(require('../package.json').version)
    .option(
        '--port <port>',
        'server is listening on localhost',
        str => Number.parseInt(str, 10) || 3000,
        3000
    )
    .option(
        '--concurrency <n>',
        'max number of in-flight requests',
        str => Number.parseInt(str, 10) || 8,
        8
    )
    .option('--assets <folder>', 'name of public/assets folder', 'public')
    .option('--routes <routes>', '(for testing) comma-delimited routes', str =>
        str.split(',').filter(Boolean)
    )
    .option('--out <folder>', 'path to build folder', 'build')
    .option(
        '--ignore404',
        'icejaw will ignore 404s instead of exiting the process'
    )
    .option(
        '--redirect [strategy]',
        'should icejaw "follow", "ignore", or throw "error" on redirects?',
        'follow'
    )
    .parse(process.argv)

module.exports = function(
    {
        port = program.port,
        concurrency = program.concurrency,
        assets = program.assets,
        routes = program.routes,
        out = program.out,
        ignore404 = !!program.ignore404,
        redirect = program.redirect,
    } = {}
) {
    return Promise.try(() => {
        assert(Number.isInteger(port))
        assert(Number.isInteger(concurrency))
        assert(typeof routes === 'undefined' || Array.isArray(routes))
        assert(typeof out === 'string')
        assert(typeof assets === 'string')
        assert(typeof ignore404 === 'boolean')
        assert(['follow', 'ignore', 'error'].includes(redirect))

        const outPath = Path.resolve(process.cwd(), out)
        const publicPath = Path.resolve(process.cwd(), assets)

        let onResolve, onReject
        const deferredPromise = new Promise((resolve, reject) => {
            onResolve = resolve
            onReject = reject
        })

        const orchestrator = new Orchestrator()

        orchestrator.task('clean', cb => {
            return rimraf(outPath, cb)
        })

        const stats = {
            routeCount: 0, // amount of unique routes passed to crawler
            fileCount: 0, // amount of routes that turned into generated files
            assetCount: 0, // amount of asset files copied into --assets
        }

        orchestrator.task('copy', ['clean'], () => {
            debug(`Static assets copied from ${publicPath} -> ${outPath}`)
            const opts = {
                // expands symlinks
                follow: true,
                // ignore empty directories
                nodir: true,
            }
            return vfs
                .src(publicPath + '/**', opts)
                .pipe(
                    streams.tap(() => {
                        stats['assetCount'] += 1
                    })
                )
                .pipe(vfs.dest(outPath))
        })

        orchestrator.task('default', ['copy'], () => {
            let routeStream
            if (Array.isArray(routes)) {
                routeStream = es.readArray(routes)
            } else {
                routeStream = process.stdin.pipe(es.split())
            }
            const stream = routeStream
                .pipe(streams.dropEmpty())
                .pipe(streams.intoPaths())
                .pipe(streams.dropDupes())
                .pipe(
                    streams.tap(() => {
                        stats['routeCount'] += 1
                    })
                )
                .pipe(crawler({ port, concurrency, ignore404, redirect }))

            // we need to tap the stream right here to handle any
            // potential crawler errors for a chance to short-circuit.
            // else the stream seem to hang.
            stream.on('error', err => onReject(err))

            return stream
                .pipe(
                    streams.tap(() => {
                        stats['fileCount'] += 1
                    })
                )
                .pipe(vfs.dest(outPath))
        })

        orchestrator.on('err', err => onReject(err))
        orchestrator.start(err => {
            if (err) return onReject(err)
            onResolve(
                Object.assign({}, stats, {
                    assets: publicPath,
                    out: outPath,
                })
            )
        })

        return deferredPromise
    })
}
