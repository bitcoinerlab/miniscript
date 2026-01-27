// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

/**
 * Miniscript expression parser.
 * Builds a lightweight AST shared by the compiler and analyzer.
 * See ANALYZER.md for the AST shape and examples.
 */

export type Node =
  | { type: '0' | '1' }
  | { type: 'pk_k' | 'pk_h'; key: string }
  | {
      type: 'older' | 'after' | 'sha256' | 'ripemd160' | 'hash256' | 'hash160';
      value: string;
    }
  | { type: 'multi' | 'multi_a'; k: string; keys: string[] }
  | { type: 'thresh'; k: string; subs: Node[] }
  | {
      type: 'and_v' | 'and_b' | 'or_b' | 'or_c' | 'or_d' | 'or_i';
      args: [Node, Node];
    }
  | { type: 'andor'; args: [Node, Node, Node] }
  | { type: 'a' | 's' | 'c' | 'd' | 'v' | 'j' | 'n'; arg: Node };

type WrapperLetter = 'a' | 's' | 'c' | 'd' | 'v' | 'j' | 'n' | 't' | 'l' | 'u';

const allowedWrapperLetterSet = new Set<WrapperLetter>([
  'a',
  's',
  'c',
  'd',
  'v',
  'j',
  'n',
  't',
  'l',
  'u'
]);

/** Split a function argument list without breaking nested expressions. */
const splitArgs = (
  /** Raw argument string. */
  argsString: string
): string[] => {
  if (!argsString) return [];
  const result: string[] = [];
  let level = 0;
  let last = 0;
  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];
    if (!char) continue;
    if (char === '(') level++;
    if (char === ')') level--;
    if (level === 0 && char === ',') {
      result.push(argsString.substring(last, i));
      last = i + 1;
    }
  }
  result.push(argsString.substring(last));
  return result.map(arg => arg.trim()).filter(Boolean);
};

const getArg = (args: string[], index: number): string => {
  const arg = args[index];
  if (arg === undefined) {
    throw new Error('Invalid miniscript arguments');
  }
  return arg;
};

/** Apply a wrapper to a parsed node, expanding syntactic sugar. */
const wrapNode = (
  /** Wrapper letter to apply. */
  wrapperLetter: WrapperLetter,
  /** Parsed node to wrap. */
  node: Node
): Node => {
  switch (wrapperLetter) {
    case 'a':
    case 's':
    case 'c':
    case 'd':
    case 'v':
    case 'j':
    case 'n':
      return { type: wrapperLetter, arg: node };
    case 't':
      return { type: 'and_v', args: [node, { type: '1' }] };
    case 'l':
      return { type: 'or_i', args: [{ type: '0' }, node] };
    case 'u':
      return { type: 'or_i', args: [node, { type: '0' }] };
    default:
      throw new Error(`Unknown wrapper: ${wrapperLetter}`);
  }
};

/** Parse a base fragment (no wrappers). */
const parseBase = (
  /** Miniscript fragment without wrappers. */
  expression: string
): Node => {
  if (expression === '0' || expression === '1') return { type: expression };
  const openParen = expression.indexOf('(');
  if (openParen === -1 || !expression.endsWith(')')) {
    throw new Error(`Invalid miniscript expression: ${expression}`);
  }
  const name = expression.substring(0, openParen);
  const argsString = expression.substring(openParen + 1, expression.length - 1);
  const args = splitArgs(argsString);

  switch (name) {
    case 'pk': {
      if (args.length !== 1)
        throw new Error(`Invalid pk() args: ${expression}`);
      const key = getArg(args, 0);
      return wrapNode('c', { type: 'pk_k', key });
    }
    case 'pkh': {
      if (args.length !== 1)
        throw new Error(`Invalid pkh() args: ${expression}`);
      const key = getArg(args, 0);
      return wrapNode('c', { type: 'pk_h', key });
    }
    case 'and_n': {
      if (args.length !== 2)
        throw new Error(`Invalid and_n() args: ${expression}`);
      const left = getArg(args, 0);
      const right = getArg(args, 1);
      return {
        type: 'andor',
        args: [parseExpression(left), parseExpression(right), { type: '0' }]
      };
    }
    case 'pk_k':
    case 'pk_h': {
      if (args.length !== 1)
        throw new Error(`Invalid ${name}() args: ${expression}`);
      const key = getArg(args, 0);
      return { type: name, key };
    }
    case 'older':
    case 'after':
    case 'sha256':
    case 'ripemd160':
    case 'hash256':
    case 'hash160': {
      if (args.length !== 1)
        throw new Error(`Invalid ${name}() args: ${expression}`);
      const value = getArg(args, 0);
      return { type: name, value };
    }
    case 'multi':
    case 'multi_a': {
      if (args.length < 2)
        throw new Error(`Invalid ${name}() args: ${expression}`);
      const k = getArg(args, 0);
      return { type: name, k, keys: args.slice(1) };
    }
    case 'thresh': {
      if (args.length < 2)
        throw new Error(`Invalid thresh() args: ${expression}`);
      const k = getArg(args, 0);
      return {
        type: 'thresh',
        k,
        subs: args.slice(1).map(parseExpression)
      };
    }
    case 'and_v':
    case 'and_b':
    case 'or_b':
    case 'or_c':
    case 'or_d':
    case 'or_i': {
      if (args.length !== 2)
        throw new Error(`Invalid ${name}() args: ${expression}`);
      const left = getArg(args, 0);
      const right = getArg(args, 1);
      return {
        type: name,
        args: [parseExpression(left), parseExpression(right)]
      };
    }
    case 'andor': {
      if (args.length !== 3)
        throw new Error(`Invalid andor() args: ${expression}`);
      const left = getArg(args, 0);
      const mid = getArg(args, 1);
      const right = getArg(args, 2);
      return {
        type: 'andor',
        args: [
          parseExpression(left),
          parseExpression(mid),
          parseExpression(right)
        ]
      };
    }
    default:
      throw new Error(`Unknown miniscript fragment: ${name}`);
  }
};

/** Parse a Miniscript expression into an AST node. */
export const parseExpression = (
  /** Raw miniscript expression. */
  input: string
): Node => {
  if (typeof input !== 'string') {
    throw new Error(`Invalid miniscript expression: ${input}`);
  }
  let expression = input.trim();
  const wrapperLetters: WrapperLetter[] = [];
  while (true) {
    const match = expression.match(/^([a-z]+):/);
    if (!match) break;
    const prefix = match[1];
    if (!prefix) {
      throw new Error(`Invalid wrapper prefix: ${expression}`);
    }
    if (
      ![...prefix].every(char =>
        allowedWrapperLetterSet.has(char as WrapperLetter)
      )
    ) {
      break;
    }
    wrapperLetters.push(...(prefix.split('') as WrapperLetter[]));
    expression = expression.slice(prefix.length + 1);
  }

  let node = parseBase(expression);
  for (let i = wrapperLetters.length - 1; i >= 0; i--) {
    const wrapperLetter = wrapperLetters[i];
    if (!wrapperLetter) {
      throw new Error('Invalid wrapper sequence');
    }
    node = wrapNode(wrapperLetter, node);
  }
  return node;
};
