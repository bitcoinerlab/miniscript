// Core Miniscript compiler entry point.
// See ANALYZER.md for AST and analysis details.
import { parseExpression } from './miniscript/parse.js';
import { compileNode } from './miniscript/compile.js';
import { analyzeMiniscript, analyzeParsedNode } from './miniscript/analyze.js';

const cleanAsm = asm =>
  asm
    .trim()
    .replace(/\n/g, ' ')
    .replace(/ +(?= )/g, '');

/**
 * Compile a Miniscript expression to ASM and return sanity flags.
 * @param {string} miniscript
 * @param {{tapscript?: boolean}} [options]
 * @returns {{asm: string, issane: boolean, issanesublevel: boolean, error?: string | null}}
 */
export const compileMiniscript = (miniscript, options = {}) => {
  const node = parseExpression(miniscript);
  const asm = compileNode(node, false).join(' ');
  const analysis = analyzeParsedNode(node, options);
  return {
    asm: cleanAsm(asm),
    issane: analysis.issane,
    issanesublevel: analysis.issanesublevel,
    error: analysis.error
  };
};

export { analyzeMiniscript };
