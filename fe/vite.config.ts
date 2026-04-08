import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Shim plugin: intercepts all es-toolkit/compat/* imports that recharts needs
// and replaces them with minimal lodash-compatible implementations.
function esToolkitCompatShim(): Plugin {
  const SHIM_PREFIX = 'es-toolkit/compat/'
  return {
    name: 'es-toolkit-compat-shim',
    resolveId(id) {
      if (id.startsWith(SHIM_PREFIX)) return '\0' + id
      return null
    },
    load(id) {
      if (!id.startsWith('\0' + SHIM_PREFIX)) return null
      const fn = id.slice(('\0' + SHIM_PREFIX).length)
      switch (fn) {
        case 'sortBy':
          return `
export function sortBy(coll, iters) {
  if (!coll) return [];
  const items = Array.isArray(coll) ? [...coll] : Object.values(coll);
  const fns = [iters].flat().map(f => typeof f === 'function' ? f : o => o?.[f]);
  return items.sort((a, b) => { for (const f of fns) { const va=f(a),vb=f(b); if(va<vb)return -1; if(va>vb)return 1; } return 0; });
}
export default sortBy;`
        case 'throttle':
          return `
export function throttle(fn, wait=0) {
  let last=0, timer=null;
  function throttled(...args) {
    const now = Date.now();
    const rem = wait - (now - last);
    if (rem <= 0) { last=now; clearTimeout(timer); timer=null; return fn.apply(this, args); }
    if (!timer) { timer = setTimeout(() => { last=Date.now(); timer=null; fn.apply(this, args); }, rem); }
  }
  throttled.cancel = () => { clearTimeout(timer); timer=null; };
  return throttled;
}
export default throttle;`
        case 'get':
          return `
export function get(obj, path, def) {
  const parts = Array.isArray(path) ? path : String(path).replace(/\\[(\\d+)\\]/g,'.$1').split('.');
  let cur = obj;
  for (const p of parts) { if (cur == null) return def; cur = cur[p]; }
  return cur === undefined ? def : cur;
}
export default get;`
        case 'isPlainObject':
          return `
export function isPlainObject(v) {
  if (typeof v !== 'object' || v === null) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === null || proto === Object.prototype;
}
export default isPlainObject;`
        case 'last':
          return `
export function last(arr) { return arr && arr.length ? arr[arr.length-1] : undefined; }
export default last;`
        case 'maxBy':
          return `
export function maxBy(arr, fn) {
  if (!arr || !arr.length) return undefined;
  const f = typeof fn === 'function' ? fn : o => o?.[fn];
  return arr.reduce((m, x) => f(x) > f(m) ? x : m, arr[0]);
}
export default maxBy;`
        case 'minBy':
          return `
export function minBy(arr, fn) {
  if (!arr || !arr.length) return undefined;
  const f = typeof fn === 'function' ? fn : o => o?.[fn];
  return arr.reduce((m, x) => f(x) < f(m) ? x : m, arr[0]);
}
export default minBy;`
        case 'omit':
          return `
export function omit(obj, keys) {
  if (!obj) return {};
  const ks = new Set(Array.isArray(keys) ? keys : [keys]);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !ks.has(k)));
}
export default omit;`
        case 'range':
          return `
export function range(start, end, step) {
  if (end === undefined) { end = start; start = 0; }
  if (step === undefined) step = start < end ? 1 : -1;
  if (step === 0 || (end > start && step < 0) || (end < start && step > 0)) return [];
  const result = [];
  for (let i = start; step > 0 ? i < end : i > end; i += step) result.push(i);
  return result;
}
export default range;`
        case 'sumBy':
          return `
export function sumBy(arr, fn) {
  if (!arr || !arr.length) return 0;
  const f = typeof fn === 'function' ? fn : o => o?.[fn] ?? 0;
  return arr.reduce((s, x) => s + (f(x) || 0), 0);
}
export default sumBy;`
        case 'uniqBy':
          return `
export function uniqBy(arr, fn) {
  if (!arr) return [];
  const f = typeof fn === 'function' ? fn : o => o?.[fn];
  const seen = new Set();
  return arr.filter(x => { const k = f(x); if (seen.has(k)) return false; seen.add(k); return true; });
}
export default uniqBy;`
        default:
          return `export default function() {}; export const ${fn} = function() {};`
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), esToolkitCompatShim()],
})
