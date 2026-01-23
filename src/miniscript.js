// Initial author: Pieter Wuille ( https://github.com/sipa/miniscript/blob/master/index.html)
// Adapted by Jose-Luis Landabaso - https://bitcoinerlab.com:
//  compilePolicy, compileMiniscript with issane, issanesublevel and cleanAsm

import bindings from './bindings.js';
import { cleanAsm } from './asm.js';

let Module;
let em_miniscript_compile;
let em_miniscript_analyze;
let modulePromise;

const initModule = () => {
  if (!modulePromise) {
    modulePromise = Promise.resolve(bindings()).then(resolved => {
      Module = resolved;
      em_miniscript_compile = Module.cwrap('miniscript_compile', 'none', [
        'string',
        'number',
        'number',
        'number',
        'number',
        'number',
        'number'
      ]);
      em_miniscript_analyze = Module.cwrap('miniscript_analyze', 'none', [
        'string',
        'number',
        'number',
        'number',
        'number'
      ]);
      return Module;
    });
  }

  return modulePromise;
};

export const ready = initModule();

const ensureReady = () => {
  if (!Module || !em_miniscript_compile || !em_miniscript_analyze) {
    throw new Error('Miniscript bindings not ready. Await ready before calling compile functions.');
  }
};

/**
 * @typedef {Object} CompilePolicyResult
 * @property {string} miniscript - The compiled miniscript expression.
 * @property {string} asm - The compiled miniscript as Bitcoin asm code.
 * @property {boolean} issane - Whether the miniscript is sane at the top level.
 * @property {boolean} issanesublevel - Whether the miniscript is sane at the sublevel.
 */

/**
 * @typedef {Object} CompileMiniscriptResult
 * @property {string} asm - The Bitcoin asm code of the compiled miniscript expression.
 * @property {boolean} issane - Whether the miniscript is sane at the top level.
 * @property {boolean} issanesublevel - Whether the miniscript is sane at the sublevel.
 */


/**
 * Compiles a miniscript policy into a miniscript expression (if possible).
 * @function
 *
 * @param {string} policy - The miniscript policy to compile.
 * @returns {CompilePolicyResult}
 */
export const compilePolicy = policy => {
  ensureReady();
  const miniscript = Module._malloc(10000);
  const cost = Module._malloc(500);
  const asm = Module._malloc(100000);
  const issane = Module._malloc(10);
  const issanesublevel = Module._malloc(10);
  em_miniscript_compile(
    policy,
    miniscript,
    10000,
    cost,
    500,
    asm,
    100000,
    issane,
    10,
    issanesublevel,
    10
  );
  const result = {
    miniscript: Module.UTF8ToString(miniscript),
    asm: cleanAsm(Module.UTF8ToString(asm)),
    issane: Module.UTF8ToString(issane) === 'true' ? true : false,
    issanesublevel:
      Module.UTF8ToString(issanesublevel) === 'true' ? true : false
  };
  Module._free(miniscript);
  Module._free(cost);
  Module._free(asm);
  Module._free(issane);
  Module._free(issanesublevel);

  return result;
};

/**
 * Compiles a miniscript expression and returns its asm code.
 * @function
 *
 * @param {string} miniscript - A miniscript expression.
 * @returns {CompileMiniscriptResult}
 */
export const compileMiniscript = miniscript => {
  ensureReady();
  const analysis = Module._malloc(50000);
  const asm = Module._malloc(100000);
  const issane = Module._malloc(10);
  const issanesublevel = Module._malloc(10);
  em_miniscript_analyze(
    miniscript,
    analysis,
    50000,
    asm,
    100000,
    issane,
    10,
    issanesublevel,
    10
  );
  const result_asm = Module.UTF8ToString(asm);
  const result_issane = Module.UTF8ToString(issane);
  const result_issanesublebel = Module.UTF8ToString(issanesublevel);
  Module._free(analysis);
  Module._free(asm);
  Module._free(issane);
  Module._free(issanesublevel);

  return {
    asm: cleanAsm(result_asm),
    issane: result_issane === 'true' ? true : false,
    issanesublevel: result_issanesublebel === 'true' ? true : false
  };
};
