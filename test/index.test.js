
const test = require('ava')
const Crawler = require('../src/crawler')
const request = require('../src/request')
const icejaw = require('../src')
const app = require('koa')()
const router = new require('koa-router')()


router
  .get('/', function * () {
    this.body = 'hello world'
  })
  .get('/users', function * () {
    this.body = 'ok'
  })
app.use(router.routes())
app.listen(5000)

const url = (route) => `http://localhost:5000${route}`

test('sanity check', (t) => {
  t.pass()
})

test('request sanity check', async (t) => {
  const route = '/'
  const result = await request(url(route))
  t.is(result.path, '/index.html')
})

test('trailing slash becomes /index.html', async (t) => {
  const route = '/users/'
  const result = await request(url(route))
  t.is(result.path, '/users/index.html')
})

test('no trailing slash becomes {route}.html', async (t) => {
  const route = '/users'
  const result = await request(url(route))
  t.is(result.path, '/users.html')
})
