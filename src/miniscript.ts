// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

// Core Miniscript compiler entry point.
// See ANALYZER.md for AST and analysis details.
import { parseExpression } from './miniscript/parse';
import { compileNode } from './miniscript/compile';
import {
  analyzeMiniscript,
  analyzeParsedNode,
  type AnalyzeOptions
} from './miniscript/analyze';

export type CompileResult = {
  asm: string;
  issane: boolean;
  issanesublevel: boolean;
  error: string | null;
};

const cleanAsm = (asm: string): string =>
  asm
    .trim()
    .replace(/\n/g, ' ')
    .replace(/ +(?= )/g, '');

/** Compile a Miniscript expression to ASM and return sanity flags. */
export const compileMiniscript = (
  /** Raw miniscript expression. */
  miniscript: string,
  /** Analysis options. */
  options: AnalyzeOptions = {}
): CompileResult => {
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
