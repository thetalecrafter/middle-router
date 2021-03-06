/* eslint-env mocha, browser */
const assert = require('assert')
const Router = require('../router')

// run same tests as on server
require('./server.test')
require('./links.test')

describe('Router#start using push/pop state', () => {
  it('routes from the current location.pathname', async () => {
    let called = 0
    let router = new Router()
      .use('/foo/:bar', ({ params, resolve }) => {
        ++called
        assert.strictEqual(params.bar, 'bar', 'param bar should be set')
        resolve()
      })

    history.replaceState(null, document.title, '/foo/bar')
    await router.start()
    router.stop()
    assert.strictEqual(called, 1, 'matching route should be called')
  })

  it('listens to popstate events', async () => {
    let called = 0
    let router = new Router()
      .use('/foo/:bar', ({ params }) => {
        ++called
        assert.strictEqual(params.bar, 'bas', 'param bar should be set')
      })
      .use(({ resolve }) => { resolve() })

    history.replaceState(null, document.title, '/foo/bas')
    await router.start() // called 1
    await router.navigate('/') // not called
    await router.back() // called 2
    await router.forward() // not called
    await router.back() // called 3

    router.stop()
    assert.strictEqual(called, 3, 'matching route should be called for each matching location')
  })
})

describe('Router#start using hash', () => {
  it('routes from the current location.hash', async () => {
    let called = 0
    let router = new Router({ hash: true })
      .use('/foo/:bar', ({ params, resolve }) => {
        ++called
        assert.strictEqual(params.bar, 'bat', 'param bar should be set')
        resolve()
      })

    history.replaceState(null, document.title, '#/foo/bat')
    await router.start()
    router.stop()
    assert.strictEqual(called, 1, 'matching route should be called')
  })

  it('listens to hash changing', async () => {
    let called = 0
    let router = new Router({ hash: true })
      .use('/foo/:bar', ({ params }) => {
        ++called
        assert.strictEqual(params.bar, 'bax', 'param bar should be set')
      })
      .use(({ resolve }) => { resolve() })

    history.replaceState(null, document.title, '#/foo/bax')
    await router.start() // called 1
    await router.navigate('/') // not called
    await router.back() // called 2
    await router.forward() // not called
    await router.back() // called 3

    router.stop()
    assert.strictEqual(called, 3, 'matching route should be called for each matching location')
  })

  it('supports hash routes with pseudo query params', async () => {
    let called = 0
    let router = new Router({ hash: true })
      .use('/login', ({ location }) => {
        ++called
        assert.strictEqual(location.query.foo, 'bar', 'param bar should be set')
      })
      .use(({ resolve }) => { resolve() })

    history.replaceState(null, document.title, '#/login?foo=bar')
    await router.start() // called 1

    router.stop()
    assert.strictEqual(called, 1, 'matching route should be called')
  })

  it('uses the path inside hash', async () => {
    let called = 0
    let router = Router({ hash: '#$!' })
      .use('/path', () => {
        assert.fail('must not match from pathname when hash routing')
      })
      .use(({ path }) => {
        ++called
        assert.strictEqual(path, '/hash/route', 'path must be from hash')
      })
      .use('/hash', Router().use(({ path, location, resolve }) => {
        assert.strictEqual(path, '/route', 'path is relative to mount point')
        assert.strictEqual(location.hash, '', 'hash is empty')
        resolve()
      }))
    history.replaceState(null, document.title, '/path#$!/hash/route')
    await router.start()

    router.stop()
    assert.strictEqual(called, 1, 'matching route should be called')
  })
})

describe('Route middleware arguments on client', () => {
  it('has an exiting promise when listening', async () => {
    let stage = 'before'
    let router = Router({ hash: true })
      .use('/', async ({ exiting, next, resolve }) => {
        assert(exiting instanceof Promise, 'exiting must be a promise when listening')
        await next()
        stage = 'resolved'
        resolve() // call resolve or this will wait indefinitely
        await exiting
        stage = 'after'
      })
      .use(({ resolve }) => { resolve() })

    history.replaceState(null, document.title, '#/')
    router.start()
    assert.strictEqual(stage, 'before', 'before route promise completes, exiting must not be resolved')

    await router.routing
    assert.strictEqual(stage, 'resolved', 'after route promise completes, exiting must not be resolved')

    await router.navigate('/nowhere')
    assert.strictEqual(stage, 'after', 'after next route, exiting must be resolved')
  })
})

describe('Trying to navigate without listening first', () => {
  it('throws when navigate is called', () => {
    assert.throws(() => Router().navigate(), 'should throw when trying to navigate')
  })

  it('throws when replace is called', () => {
    assert.throws(() => Router().replace(), 'should throw when trying to replace')
  })

  it('throws when back is called', () => {
    assert.throws(() => Router().back(), 'should throw when trying to go back')
  })

  it('throws when forward is called', () => {
    assert.throws(() => Router().forward(), 'should throw when trying to go forward')
  })
})
