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
    if (argsString[i] === '(') level++;
    if (argsString[i] === ')') level--;
    if (level === 0 && argsString[i] === ',') {
      result.push(argsString.substring(last, i));
      last = i + 1;
    }
  }
  result.push(argsString.substring(last));
  return result.map(arg => arg.trim()).filter(Boolean);
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
      return wrapNode('c', { type: 'pk_k', key: args[0] });
    }
    case 'pkh': {
      if (args.length !== 1)
        throw new Error(`Invalid pkh() args: ${expression}`);
      return wrapNode('c', { type: 'pk_h', key: args[0] });
    }
    case 'and_n': {
      if (args.length !== 2)
        throw new Error(`Invalid and_n() args: ${expression}`);
      return {
        type: 'andor',
        args: [
          parseExpression(args[0]),
          parseExpression(args[1]),
          { type: '0' }
        ]
      };
    }
    case 'pk_k':
    case 'pk_h': {
      if (args.length !== 1)
        throw new Error(`Invalid ${name}() args: ${expression}`);
      return { type: name, key: args[0] };
    }
    case 'older':
    case 'after':
    case 'sha256':
    case 'ripemd160':
    case 'hash256':
    case 'hash160': {
      if (args.length !== 1)
        throw new Error(`Invalid ${name}() args: ${expression}`);
      return { type: name, value: args[0] };
    }
    case 'multi':
    case 'multi_a': {
      if (args.length < 2)
        throw new Error(`Invalid ${name}() args: ${expression}`);
      return { type: name, k: args[0], keys: args.slice(1) };
    }
    case 'thresh': {
      if (args.length < 2)
        throw new Error(`Invalid thresh() args: ${expression}`);
      return {
        type: 'thresh',
        k: args[0],
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
      return {
        type: name,
        args: [parseExpression(args[0]), parseExpression(args[1])]
      };
    }
    case 'andor': {
      if (args.length !== 3)
        throw new Error(`Invalid andor() args: ${expression}`);
      return {
        type: 'andor',
        args: [
          parseExpression(args[0]),
          parseExpression(args[1]),
          parseExpression(args[2])
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
    node = wrapNode(wrapperLetters[i], node);
  }
  return node;
};
