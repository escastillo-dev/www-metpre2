const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');
const { IDBFactory } = require('fake-indexeddb');
const transpile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
const cacheSource = transpile('app/services/apiCache.ts');
const operationalSource = transpile('app/services/operationalCache.ts');
function setup() {
  let now = Date.now(), responder = async () => ({ data: { estatus: 1, value: 'initial' }, status: 200, headers: {} });
  class Clock extends Date { static now() { return now; } }
  const calls = [], env = { indexedDB: new IDBFactory(), process: { env: {} }, setTimeout, clearTimeout, URLSearchParams, Date: Clock, localStorage: { getItem: key => key === 'userId' ? '1' : 'secret' } };
  const cache = {};
  vm.runInNewContext(cacheSource, { ...env, exports: cache });
  const client = {};
  vm.runInNewContext(operationalSource, { ...env, exports: client, require: name => name === './apiCache' ? cache : { ...axios, get: async (url, config) => { calls.push({ url, config }); return responder(url, config); } } });
  return { client, cache, calls, advance: ms => { now += ms; }, respond: fn => { responder = fn; } };
}

test('filters and pages have distinct stable keys; repeated navigation avoids downloads', async () => {
  const { client, calls } = setup();
  const url = '/backend/productos-consumidos';
  await client.operationalGet(url, { params: { offset: 0, q: 'milk' } });
  await client.operationalGet(url, { params: { q: 'milk', offset: 0 } });
  assert.equal(calls.length, 1);
  await client.operationalGet(url, { params: { offset: 20, q: 'milk' } });
  await client.operationalGet(url, { params: { offset: 0, q: 'bread' } });
  assert.equal(calls.length, 3);
});

test('ETag revalidation after expiry reuses body on 304 and renews freshness', async () => {
  const { client, respond, calls, advance } = setup();
  respond(async () => ({ data: { estatus: 1, total: 42 }, status: 200, headers: { etag: '"v1"' } }));
  await client.operationalGet('/backend/mermas/sucursales/1');
  advance(5 * 60 * 1000 + 1);
  respond(async (_, config) => {
    assert.equal(config.headers.get('If-None-Match'), '"v1"');
    assert.equal(config.validateStatus(304), true);
    return { data: null, status: 304, headers: {} };
  });
  assert.equal((await client.operationalGet('/backend/mermas/sucursales/1')).data.total, 42);
  await client.operationalGet('/backend/mermas/sucursales/1');
  assert.equal(calls.length, 2);
});

test('mutation invalidates all filters of affected domains, preserving unrelated data and catalogs', async () => {
  const { client, cache, calls } = setup();
  await cache.getCached('motivos_merma', async () => 'catalog');
  await client.operationalGet('/backend/mermas/sucursales/1');
  await client.operationalGet('/backend/mermas/sucursales/2');
  await client.operationalGet('/backend/recuperaciones/stats');
  await client.invalidateOperational(['mermas', 'dashboard']);
  await client.operationalGet('/backend/recuperaciones/stats');
  assert.equal(calls.length, 3);
  assert.equal(await cache.getCached('motivos_merma', async () => 'unexpected'), 'catalog');
  await client.operationalGet('/backend/mermas/sucursales/1');
  await client.operationalGet('/backend/mermas/sucursales/2');
  assert.equal(calls.length, 5);
});

test('invalidation never repopulates old data and does not duplicate unrelated pending requests', async () => {
  const { cache } = setup();
  let resolveAffected, resolveOther, startAffected, startOther, otherCalls = 0;
  const startedAffected = new Promise(r => { startAffected = r; });
  const startedOther = new Promise(r => { startOther = r; });
  const affected = cache.getCached('ops:mermas:a', () => { startAffected(); return new Promise(r => { resolveAffected = r; }); });
  const otherFetcher = () => { otherCalls++; startOther(); return new Promise(r => { resolveOther = r; }); };
  const other = cache.getCached('ops:recuperaciones:a', otherFetcher);
  await Promise.all([startedAffected, startedOther]);
  await cache.invalidateCachePrefix('ops:mermas:');
  const sameOther = cache.getCached('ops:recuperaciones:a', otherFetcher);
  resolveAffected('stale'); resolveOther('good');
  await Promise.all([affected, other, sameOther]);
  assert.equal(otherCalls, 1);
  assert.equal(await cache.getCached('ops:mermas:a', async () => 'fresh'), 'fresh');
});

test('API error responses are not cached and servers without ETag still work', async () => {
  const { client, respond, calls } = setup();
  respond(async () => ({ data: { estatus: 0 }, status: 200, headers: {} }));
  await client.operationalGet('/backend/caducidad/registros');
  respond(async () => ({ data: { estatus: 1, total: 3 }, status: 200, headers: {} }));
  assert.equal((await client.operationalGet('/backend/caducidad/registros')).data.total, 3);
  assert.equal(calls.length, 2);
});
