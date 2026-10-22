const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

test('mermas uses server totals across all pages without downloading product details', async () => {
  let source = fs.readFileSync('app/components/MermasContent.tsx', 'utf8');
  const marker = "  return (\n    <div style={{ padding: '20px' }}>";
  assert.ok(source.includes(marker));
  source = source.replace(marker, "  globalThis.view = {setSucursalesAsignadas, fetchRegistrosMermas, calcularTotalPerdidasFiltradas, setPageOffset, records, resumenServidor, totalPerdidasDinero};\n" + marker);
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  let states = [], refs = [], stateIndex = 0, refIndex = 0;
  const calls = [];
  const react = { ...React, useEffect() {}, useMemo: fn => fn(),
    useState(initial) { const i = stateIndex++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = refIndex++; return refs[i] ||= { current: initial }; },
  };
  const context = { exports: {}, process: { env: {} }, console, localStorage: { getItem: () => '1' },
    require: name => name === 'react' ? react : name.includes('operationalCache') ? {
      operationalGet: async (url, config) => {
        calls.push({ url, config });
        assert.ok(url.includes('/mermas/sucursales/'));
        return { data: { estatus: 1, total: 81, resumen: { totalRegistros: 81, totalImporte: '1234.50', mermasHoy: 4, mermasMes: 20, mermasUltimos30Dias: 22 },
          mermas: [{ idMaMe: 7, idCentro: '1', Fecha: '2026-10-22', Anfitrion: 1, idUsuario: 1 }] } };
      },
    } : name.includes('useFocusTrap') ? { useFocusTrap: () => ({ current: null }) } : {},
  };
  vm.createContext(context); vm.runInContext(js, context);
  const render = () => { stateIndex = refIndex = 0; context.exports.default(); return context.view; };
  let view = render(); view.setSucursalesAsignadas([{ idCentro: '1', Sucursal: 'Centro' }]);
  view = render(); await view.fetchRegistrosMermas();
  view = render(); await view.calcularTotalPerdidasFiltradas();
  view = render(); assert.equal(view.totalPerdidasDinero, 1234.5); assert.equal(calls.length, 1);
  view.setPageOffset(20); view = render(); await view.fetchRegistrosMermas();
  view = render(); assert.equal(view.resumenServidor.totalRegistros, 81);
  assert.equal(calls[1].config.params.offset, 20); assert.equal(calls[1].config.params.limit, 20);
});
