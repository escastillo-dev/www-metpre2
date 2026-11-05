const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;

function setupHook(fetcher) {
  const values = [], timers = new Map();
  let cursor = 0, cleanup, timerId = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = initial;
      return [values[index], value => { values[index] = typeof value === 'function' ? value(values[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initial };
      return values[index];
    },
    useEffect(effect) { cleanup ??= effect(); },
  };
  const exports = {};
  vm.runInNewContext(compile('app/hooks/useProductSearch.ts'), {
    exports, Error,
    require: name => name === 'react' ? react : { getCachedProductSearch: fetcher },
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id),
  });
  return {
    render() { cursor = 0; return exports.useProductSearch(); },
    async flush() {
      const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback());
      await new Promise(resolve => setImmediate(resolve));
    },
    dispose() { cleanup(); },
  };
}
const product = code => ({ CodigoBarras: code, Descripcion: code });
const response = (codes, total) => ({ data: { estatus: 1, productos: codes.map(product), total } });

test('loads pages, retains barcode zeroes, deduplicates and refreshes from page zero', async () => {
  const calls = [];
  const env = setupHook(async (...args) => {
    calls.push(args);
    return args[2] === 0 ? response(['001', '002'], 4) : response(['002', '003'], 4);
  });
  env.render().search(' leche ');
  await env.flush();
  assert.equal(env.render().total, 4);
  assert.equal(env.render().hasMore, true);
  env.render().loadMore();
  env.render().loadMore(); // A double click must not request the same page twice.
  await env.flush();
  assert.deepEqual(Array.from(env.render().products, p => p.CodigoBarras), ['001', '002', '003']);
  assert.equal(env.render().hasMore, false);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], ['leche', 50, 2, false]);
  env.render().refresh();
  await env.flush();
  assert.deepEqual(calls[2], ['leche', 50, 0, true]);
  assert.equal(env.render().products.length, 2);
  env.dispose();
});

test('ignores late responses after a new query, clearing, selection or unmount', async () => {
  const pending = [];
  const env = setupHook(() => new Promise(resolve => pending.push(resolve)));
  env.render().search('leche'); await env.flush();
  env.render().search('pan'); await env.flush();
  pending[1](response(['pan'], 1)); await env.flush();
  pending[0](response(['leche'], 1)); await env.flush();
  assert.equal(env.render().products[0].CodigoBarras, 'pan');
  env.render().search('arroz'); await env.flush();
  env.render().reset();
  pending[2](response(['arroz'], 1)); await env.flush();
  assert.equal(env.render().products.length, 0);
  assert.equal(env.render().loading, false);
  env.render().search('cafe'); await env.flush();
  env.dispose();
  pending[3](response(['cafe'], 1)); await env.flush();
  assert.equal(env.render().products.length, 0);
});

test('debounces input and displays failures without losing a previously loaded page', async () => {
  let calls = 0;
  const env = setupHook(async () => {
    if (++calls > 1) throw new Error('Sin conexion');
    return response(['001'], 2);
  });
  env.render().search('le'); env.render().search('leche');
  await env.flush();
  assert.equal(calls, 1);
  env.render().loadMore(); await env.flush();
  assert.equal(env.render().products.length, 1);
  assert.equal(env.render().error, 'Sin conexion');
  assert.equal(env.render().loading, false);
  env.dispose();
});

test('product cache separates query pages and refresh invalidates all pages of that query', async () => {
  const calls = [], invalidations = [], cache = new Map(), exports = {};
  vm.runInNewContext(compile('app/services/productCache.ts'), {
    exports, process: { env: {} }, localStorage: { getItem: () => 'credentials' },
    require: name => name === 'axios' ? { get: async (url, config) => {
      calls.push({ url, ...config.params }); return response(['001'], 1);
    } } : {
      PRODUCT_TTL_MS: 100,
      getCached: async (key, fetcher) => {
        if (!cache.has(key)) cache.set(key, await fetcher());
        return cache.get(key);
      },
      invalidateCachePrefix: async prefix => {
        invalidations.push(prefix);
        for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
      },
    },
  });
  await exports.getCachedProductSearch(' leche ', 50, 0);
  await exports.getCachedProductSearch('leche', 50, 0);
  await exports.getCachedProductSearch('leche', 50, 50);
  await exports.getCachedProductSearch('pan', 50, 0);
  assert.equal(calls.length, 3);
  assert.equal(calls[1].offset, 50);
  await exports.getCachedProductSearch('leche', 50, 0, true);
  await exports.getCachedProductSearch('leche', 50, 50);
  await exports.getCachedProductSearch('pan', 50, 0);
  assert.equal(calls.length, 5);
  assert.equal(invalidations.length, 1);
  assert.equal(calls[0].q, 'leche');
});
