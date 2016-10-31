
const test = require('ava')
// 3rd
const koa = require('koa')
const Router = require('koa-router')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const temp = Promise.promisifyAll(require('temp').track())
// 1st
const request = require('../src/request')
const icejaw = require('../src')


// TEST SERVER


const app = koa()
const router = new Router()

router
  .get('/', function * () { this.body = 'homepage' })
  .get('/foo', function * () { this.body = 'hello foo' })
  .get('/example.json', function * () { this.body = { ok: true } })
  .get('/a/b/c', function * () { this.body = 'ok' })
  .get('/400', function * () { this.assert(false, 400) })
  .get('/redirect', function * () { this.redirect('/') })
app.use(router.routes())
app.listen(5000)

const url = (route) => `http://localhost:5000${route}`


// =========================================================


test('sanity check', (t) => {
  t.pass()
})


test('request sanity check', async (t) => {
  const route = '/'
  const result = await request(url(route))
  t.is(result.path, '/index.html')
})


test('trailing slash becomes /index.html', async (t) => {
  const route = '/foo/'
  const result = await request(url(route))
  t.is(result.path, '/foo/index.html')
})


test('no trailing slash becomes {route}.html', async (t) => {
  const route = '/foo'
  const result = await request(url(route))
  t.is(result.path, '/foo.html')
})


test('should pass on 200 and create build dir', async (t) => {
  let opts
  try {
    opts = await makeIcejaw({ routes: ['/'] })
  } catch (err) {
    return t.fail()
  }
  t.is(await read(`${opts.out}/index.html`), 'homepage')
})


test('/foo becomes /foo.html', async (t) => {
  const {out} = await makeIcejaw({ routes: ['/foo'] })
  t.is(await read(`${out}/foo.html`), 'hello foo')
})


test('/foo/ becomes /foo/index.html', async (t) => {
  const {out} = await makeIcejaw({ routes: ['/foo/'] })
  t.is(await read(`${out}/foo/index.html`), 'hello foo')
})


test('multiple segments get nested', async (t) => {
  const {out} = await makeIcejaw({ routes: ['/a/b/c'] })
  t.true(await exists(`${out}/a/b/c.html`))
})


// NON-200 HANDLING


test('should bail on 404 by default', (t) => {
  t.throws(makeIcejaw({ routes: ['/not-found'] }), /NotOkError/)
})

test('should not bail on 404 if ignore404', (t) => {
  t.notThrows(makeIcejaw({ routes: ['/not-found'], ignore404: true }))
})

test('should bail on other non-200 responses', (t) => {
  t.throws(makeIcejaw({ routes: ['/400'] }), /NotOkError/)
})


// REDIRECTS (follow | ignore | error)


test('follows redirects by default', async (t) => {
  const {out} = await makeIcejaw({
    routes: [
      '/redirect',
      '/'
    ]
  })
  t.is(await read(`${out}/redirect.html`), 'homepage')
  t.is(await read(`${out}/index.html`), 'homepage')
})


test('ignores when redirect="ignore"', async (t) => {
  const {out} = await makeIcejaw({
    redirect: 'ignore',
    routes: [
      '/redirect',
      '/'
    ]
  })
  t.false(await exists(`${out}/redirect.html`))
  t.is(await read(`${out}/index.html`), 'homepage')
})


test('exits when redirect="error"', async (t) => {
  const out = await tempDir()
  const promise = makeIcejaw({
    out,
    redirect: 'error',
    routes: [
      '/redirect',
      '/'
    ]
  })
  t.throws(promise, /RedirectError/)
  t.false(await exists(`${out}/redirect.html`))
  t.false(await exists(`${out}/index.html`))
})


// =========================================================


// EXTENSIONS


test('adds .html if there is no extension', async (t) => {
  const {out} = await makeIcejaw({ routes: ['/foo'] })
  t.true(await exists(`${out}/foo.html`))
})


test('does not add extension if one exists', async (t) => {
  const {out} = await makeIcejaw({ routes: ['/example.json'] })
  t.true(await exists(`${out}/example.json`))
})


// =========================================================


test('only sees first occurrence of each route', async (t) => {
  try {
    var {routeCount, fileCount, out} = await makeIcejaw({
      routes: [
        '/foo?a=1',
        '/foo?b=2'
      ]
    })
  } catch (err) {
    console.error(err)
  }
  t.is(routeCount, 1)
  t.is(fileCount, 1)
  t.true(await exists(`${out}/foo.html`), 'hello foo')
})


// =========================================================


// TEST HELPERS


// resolves path
function tempDir () {
  return temp.mkdirAsync('icejaw')
}


// resolves string
function read (path) {
  return fs.readFileAsync(path, { encoding: 'utf8' })
}


// resolves bool
async function exists (path) {
  try {
    return !!(await fs.statAsync(path))
  } catch (err) {
    return false
  }
}


// executes icejaw and resolves into the options object
async function makeIcejaw (opts = {}) {
  opts.port = 5000
  if (!opts.out) {
    opts.out = await tempDir()
  }
  const stats = await icejaw(opts)
  return {...opts, ...stats}
}
