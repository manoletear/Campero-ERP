/**
 * Post-build patch for Cloudflare Workers WASM + static asset compatibility.
 *
 * 1. Prepends a static yoga.wasm import to worker.js so wrangler bundles it as a
 *    CompiledWasm module. At runtime globalThis.__YOGA_WASM__ is set before app code
 *    runs, letting the instantiateWasm hook in load.js (cf-patch.js) use it.
 *
 * 2. Injects an ASSETS-binding fallback for /fonts/ (and other public-folder paths)
 *    at the top of the fetch handler. CF Workers Assets routing only intercepts
 *    external requests; subrequests from inside the Worker go through the worker
 *    handler again and would 404 via Next.js. The injected guard calls
 *    env.ASSETS.fetch() directly, bypassing Next.js for these static paths.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const workerPath = path.join(rootDir, '.open-next', 'worker.js');
const yogaWasmSrc = path.join(rootDir, 'yoga.wasm');
const yogaWasmDst = path.join(rootDir, '.open-next', 'yoga.wasm');

// Copy yoga.wasm to .open-next/ so the relative import in worker.js resolves correctly
fs.copyFileSync(yogaWasmSrc, yogaWasmDst);
console.log('[cf-post-build] yoga.wasm → .open-next/yoga.wasm');

const workerContent = fs.readFileSync(workerPath, 'utf-8');
if (workerContent.includes('__YOGA_WASM__')) {
  console.log('[cf-post-build] worker.js already patched, skipping');
  process.exit(0);
}

// --- Patch 1: YOGA_WASM static import ---
const yogaPatch = `import __YOGA_WASM__ from './yoga.wasm';
globalThis.__YOGA_WASM__ = __YOGA_WASM__;
`;

// --- Patch 2: ASSETS fallback for public-folder subrequests ---
// Inject right after `const url = new URL(request.url);` in the fetch handler.
// Handles /fonts/, /images/, and top-level public files (favicon, logos, etc.)
// that Next.js doesn't route but react-pdf and other libs may fetch internally.
const assetsGuard = `
            // Static assets from public/ (fonts, images, etc.) — serve via ASSETS binding
            // so internal subrequests (e.g. react-pdf font fetch) don't hit Next.js and 404.
            if (env.ASSETS && /^\\/(fonts|images)\\/|^\\/[^/]+\\.(ttf|woff2?|png|ico|svg)$/i.test(url.pathname)) {
                try {
                    const ar = await env.ASSETS.fetch(request);
                    if (ar.status !== 404) return ar;
                } catch (_) {}
            }`;

// Find insertion point: just after `const url = new URL(request.url);`
const insertAfter = 'const url = new URL(request.url);';
if (!workerContent.includes(insertAfter)) {
  console.error('[cf-post-build] ERROR: could not find insertion point for ASSETS guard');
  process.exit(1);
}

const patched = workerContent.replace(insertAfter, insertAfter + assetsGuard);
fs.writeFileSync(workerPath, yogaPatch + patched);
console.log('[cf-post-build] Prepended YOGA_WASM import + injected ASSETS guard into worker.js');
