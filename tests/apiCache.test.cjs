const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { IDBFactory } = require('fake-indexeddb');
const source = ts.transpileModule(fs.readFileSync('app/services/apiCache.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup(indexedDB = new IDBFactory()) {
  const storage = new Map([['userId', '1'], ['userCredentials', 'secret-not-for-cache']]);
  let now = Date.now();
  function load() {
    const exports = {};
    class Clock extends Date { static now() { return now; } }
    vm.runInNewContext(source, {
      exports, indexedDB, process: { env: {} }, setTimeout, clearTimeout, Date: Clock,
      localStorage: { getItem: key => storage.get(key) ?? null },
    });
    return exports;
  }
  return { load, storage, advance: ms => { now += ms; } };
}

test('persists after a new JS session and scopes by user', async () => {
  const env = setup();
  let calls = 0;
  const fetcher = async () => ({ estatus: 1, value: ++calls });
  await env.load().getCached('catalog', fetcher);
  assert.equal((await env.load().getCached('catalog', fetcher)).value, 1);
  env.storage.set('userId', '2');
  assert.equal((await env.load().getCached('catalog', fetcher)).value, 2);
  assert.equal(calls, 2);
});

test('coalesces concurrent requests and expires catalogs and access data', async () => {
  const env = setup(), cache = env.load();
  let calls = 0;
  const fetcher = async () => ++calls;
  await Promise.all([cache.getCached('catalog', fetcher), cache.getCached('catalog', fetcher)]);
  assert.equal(calls, 1);
  env.advance(23 * 60 * 60 * 1000);
  await cache.getCached('catalog', fetcher);
  assert.equal(calls, 1);
  env.advance(60 * 60 * 1000 + 1);
  await cache.getCached('catalog', fetcher);
  assert.equal(calls, 2);
  await cache.getCached('sucursales_1', fetcher);
  env.advance(15 * 60 * 1000 + 1);
  await cache.getCached('sucursales_1', fetcher);
  assert.equal(calls, 4);
});

test('invalidate removes memory and persisted response', async () => {
  const env = setup(), cache = env.load();
  await cache.getCached('catalog', async () => 'old');
  await cache.invalidateCache('catalog');
  assert.equal(await env.load().getCached('catalog', async () => 'new'), 'new');
});

test('logout clears persisted data and prevents late requests from repopulating it', async () => {
  const env = setup(), cache = env.load();
  await cache.getCached('catalog', async () => 'old');
  let resolve, started;
  const ready = new Promise(r => { started = r; });
  const waiting = cache.getCached('pending', () => { started(); return new Promise(r => { resolve = r; }); });
  await ready;
  await cache.clearPersistentCache();
  resolve('late');
  await waiting;
  const reopened = env.load();
  assert.equal(await reopened.getCached('catalog', async () => 'fresh'), 'fresh');
  assert.equal(await reopened.getCached('pending', async () => 'fresh'), 'fresh');
});

test('storage unavailable falls back to memory; rejected requests and API failures are not cached', async () => {
  const cache = setup({ open() { throw Error('storage unavailable'); } }).load();
  let calls = 0;
  const fetcher = async () => ++calls;
  assert.equal(await cache.getCached('good', fetcher), 1);
  assert.equal(await cache.getCached('good', fetcher), 1);
  await assert.rejects(cache.getCached('network', async () => { throw Error('offline'); }));
  assert.equal(await cache.getCached('network', async () => 'retried'), 'retried');
  await cache.getCached('api-error', async () => ({ estatus: 0 }));
  assert.equal((await cache.getCached('api-error', async () => ({ estatus: 1 }))).estatus, 1);
});

test('anonymous reads bypass cache', async () => {
  const env = setup(), cache = env.load();
  env.storage.clear();
  let calls = 0;
  await cache.getCached('catalog', async () => ++calls);
  await cache.getCached('catalog', async () => ++calls);
  assert.equal(calls, 2);
});

test('product searches share persisted queries across modules and preserve barcode zeros', async () => {
  const env = setup();
  const productSource = ts.transpileModule(fs.readFileSync('app/services/productCache.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  let calls = 0;
  function loadProducts() {
    const cache = env.load(), exports = {};
    vm.runInNewContext(productSource, {
      exports, process: { env: {} }, localStorage: { getItem: k => env.storage.get(k) },
      require: name => name === './apiCache' ? cache : {
        get: async (url, options) => {
          calls++;
          assert.equal(options.params.q, '001234');
          return { data: { estatus: 1, productos: [{ CodigoBarras: '001234', Descripcion: 'Product' }] } };
        },
      },
    });
    return exports;
  }
  await loadProducts().getCachedProductSearch(' 001234 ');
  const result = await loadProducts().getCachedProductSearch('001234');
  assert.equal(result.data.productos[0].CodigoBarras, '001234');
  assert.equal(calls, 1);
});

test('evicts old responses when the persistent limit is reached', async () => {
  const env = setup(), cache = env.load();
  for (let i = 0; i < 502; i++) {
    env.advance(1);
    await cache.getCached(`product-${i}`, async () => i);
  }
  const reopened = env.load();
  assert.equal(await reopened.getCached('product-0', async () => 'downloaded again'), 'downloaded again');
  assert.equal(await reopened.getCached('product-501', async () => 'unexpected fetch'), 501);
});
