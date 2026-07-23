/**
 * Cloudflare Workers compatibility patches applied after npm install.
 *
 * 1. pdfkit.js → pdfkit.browser.js  (removes blake3-wasm WebAssembly from pdfkit)
 * 2. blake3_js.js (nodejs) → SHA-256 shim  (prevents WebAssembly crash, keeps wrangler working)
 * 3. yoga-layout index.js → uses YOGA_WASM global binding instead of dynamic WebAssembly.instantiate
 */
const fs = require('fs');
const path = require('path');

// --- 1. Replace pdfkit node build with browser build ---
const pdfkitDir = path.join(__dirname, '..', 'node_modules', '@react-pdf', 'pdfkit', 'lib');
fs.copyFileSync(
  path.join(pdfkitDir, 'pdfkit.browser.js'),
  path.join(pdfkitDir, 'pdfkit.js'),
);
console.log('[cf-patch] pdfkit.js ← pdfkit.browser.js');

// --- 2. Replace blake3-wasm nodejs WASM loader with a pure-JS shim ---
// Wrangler uses blake3-wasm at deploy time (Node.js) for file hashing,
// so the shim must be functional — not just a stub that throws.
// In the CF Workers bundle, pdfkit.browser.js uses noble-hashes instead,
// so these functions are dead code at runtime there.
const blake3NodejsDir = path.join(
  __dirname, '..', 'node_modules', 'blake3-wasm', 'dist', 'wasm', 'nodejs',
);
const blake3Shim = `\
// CF Workers / Node.js compatible shim for blake3-wasm nodejs WASM loader.
// Uses SHA-256 via Node crypto instead of WebAssembly so it works in CF Workers
// (no WebAssembly.Module at module load time) and in Node.js (wrangler deploy).
'use strict';
const crypto = require('crypto');

class WasmHasher {
  constructor() { this._h = crypto.createHash('sha256'); }
  update(data) { this._h.update(data); return this; }
  digest(out) {
    const result = this._h.copy().digest();
    if (out) out.set(result.slice(0, out.length));
    return out;
  }
  reader() {
    const bytes = this._h.copy().digest();
    let pos = BigInt(0);
    return {
      fill(target) { target.set(bytes.slice(Number(pos), Number(pos) + target.length)); },
      set_position(p) { pos = p; },
      free() {},
    };
  }
  free() {}
}

module.exports.hash = function(data, out) {
  const result = crypto.createHash('sha256').update(data).digest();
  if (out) out.set(result.slice(0, out.length));
};
module.exports.create_hasher = function() { return new WasmHasher(); };
module.exports.create_keyed = function(_key) { return new WasmHasher(); };
module.exports.create_derive = function(_ctx) { return new WasmHasher(); };
module.exports.Blake3Hash = WasmHasher;
module.exports.HashReader = class HashReader {};
module.exports.__wbindgen_throw = function(msg) { throw new Error(msg); };
module.exports.__wasm = null;
`;
fs.writeFileSync(path.join(blake3NodejsDir, 'blake3_js.js'), blake3Shim);
console.log('[cf-patch] blake3-wasm/dist/wasm/nodejs/blake3_js.js → SHA-256 shim');

// --- 3. Patch yoga-layout/load.js to use CF Workers WASM binding ---
// @react-pdf/layout imports `yoga-layout/load` (load.js), NOT `yoga-layout` (index.js).
// load.js calls loadYogaImpl() with no args → Emscripten uses WebAssembly.instantiate(bytes)
// CF Workers forbids dynamic instantiation from buffers.
// Fix: pass instantiateWasm hook using the pre-compiled WASM module from globalThis.__YOGA_WASM__
// (set at top of worker.js by cf-post-build.js static import).
// In non-CF environments (local dev, CI build), the global is undefined → Emscripten fallback.
const yogaLoadPath = path.join(
  __dirname, '..', 'node_modules', 'yoga-layout', 'dist', 'src', 'load.js',
);
const yogaLoad = `\
// @ts-ignore untyped from Emscripten
import loadYogaImpl from '../binaries/yoga-wasm-base64-esm.js';
import wrapAssembly from "./wrapAssembly.js";
export async function loadYoga() {
  const opts = {};
  if (typeof globalThis['__YOGA_WASM__'] !== 'undefined') {
    opts.instantiateWasm = (imports, receiveInstance) => {
      receiveInstance(new WebAssembly.Instance(globalThis['__YOGA_WASM__'], imports));
    };
  }
  return wrapAssembly(await loadYogaImpl(opts));
}
export * from "./generated/YGEnums.js";
//# sourceMappingURL=load.js.map
`;
fs.writeFileSync(yogaLoadPath, yogaLoad);
console.log('[cf-patch] yoga-layout/dist/src/load.js → YOGA_WASM binding shim');
