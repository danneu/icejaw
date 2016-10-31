
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
  .get('/', function * () { this.body = 'hello world' })
  .get('/foo', function * () { this.body = 'hello foo' })
  .get('/example.json', function * () { this.body = { ok: true } })
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
  t.is(await read(`${opts.out}/index.html`), 'hello world')
})

test('should bail on 404', (t) => {
  t.throws(makeIcejaw({ routes: ['/not-found'] }))
})

test('/foo becomes /foo.html', async (t) => {
  const {out} = await makeIcejaw({ routes: ['/foo'] })
  t.is(await read(`${out}/foo.html`), 'hello foo')
})

test('/foo/ becomes /foo/index.html', async (t) => {
  const {out} = await makeIcejaw({ routes: ['/foo/'] })
  t.is(await read(`${out}/foo/index.html`), 'hello foo')
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


// resolves into the options object
async function makeIcejaw (opts = {}) {
  Object.assign(opts, {
    out: await tempDir(),
    port: 5000
  })
  await icejaw(opts)
  return opts
}
