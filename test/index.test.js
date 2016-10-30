
const test = require('ava')
const request = require('../src/request')
const app = require('koa')()
const Router = require('koa-router')
const spawn = require('child_process').spawn
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const rimraf = Promise.promisify(require('rimraf'))

const router = new Router()

router
  .get('/', function * () {
    this.body = 'hello world'
  })
  .get('/foo', function * () {
    this.body = 'hello foo'
  })
app.use(router.routes())
app.listen(5000)

const url = (route) => `http://localhost:5000${route}`

// =========================================================

test.afterEach.always('cleanup build directory', async () => {
  await rimraf('./build')
})

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

// Serial tests that touch the filesystem since the
// rimraf('./build') will cause issues
// TODO: Figure out how to run concurrently

test.serial('should pass on 200 and create ./build', async (t) => {
  try {
    await spawnIcejaw(['--routes', '/'])
  } catch (err) {
    return t.fail()
  }
  t.is(await read('./build/index.html'), 'hello world')
})

test.serial('should bail on 404', async (t) => {
  try {
    await spawnIcejaw(['--routes', '/not-found'])
  } catch (err) {
    return t.pass()
  }
  t.fail()
})

test.serial('/foo becomes /foo.html', async (t) => {
  await spawnIcejaw(['--routes', '/foo'])
  t.is(await read('./build/foo.html'), 'hello foo')
})

test.serial('/foo/ becomes /foo/index.html', async (t) => {
  await spawnIcejaw(['--routes', '/foo/'])
  t.is(await read('./build/foo/index.html'), 'hello foo')
})

// =========================================================

function read (path) {
  return fs.readFileAsync(path, { encoding: 'utf8' })
}

function spawnIcejaw (args = []) {
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
