
const test = require('ava')
// Node
const spawn = require('child_process').spawn
// 3rd
const koa = require('koa')
const Router = require('koa-router')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const temp = Promise.promisifyAll(require('temp').track())
// 1st
const request = require('../src/request')


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
  const path = await tempDir()
  try {
    await spawnIcejaw(`--routes / --out ${path}`)
  } catch (err) {
    return t.fail()
  }
  t.is(await read(`${path}/index.html`), 'hello world')
})

test('should bail on 404', async (t) => {
  try {
    await spawnIcejaw('--routes /not-found')
  } catch (err) {
    return t.pass()
  }
  t.fail()
})

test('/foo becomes /foo.html', async (t) => {
  const path = await tempDir()
  await spawnIcejaw(`--routes /foo --out ${path}`)
  t.is(await read(`${path}/foo.html`), 'hello foo')
})

test('/foo/ becomes /foo/index.html', async (t) => {
  const path = await tempDir()
  await spawnIcejaw(`--routes /foo/ --out ${path}`)
  t.is(await read(`${path}/foo/index.html`), 'hello foo')
})

// =========================================================


// EXTENSIONS


test('adds .html if there is no extension', async (t) => {
  const path = await tempDir()
  await spawnIcejaw(`--routes /foo --out ${path}`)
  t.true(await exists(`${path}/foo.html`))
})


test('does not add extension if one exists', async (t) => {
  const path = await tempDir()
  await spawnIcejaw(`--routes /example.json --out ${path}`)
  t.true(await exists(`${path}/example.json`))
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


function spawnIcejaw (args = '') {
  args = args.split(/\s+/).filter(Boolean)
  args.push('--port')
  args.push('5000')
  const child = spawn('../bin/icejaw', args)
  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', resolve)
    child.stdout.on('data', (data) => {
      console.log('[child]', data.toString().slice(0, -1))
    })
    child.stderr.on('data', (data) => {
      console.error('[child]', data.toString().slice(0, -1))
      reject()
    })
  })
}
