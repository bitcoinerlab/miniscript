import { cleanAsm } from './asm.js';

const wrapperChars = new Set(['a', 's', 'c', 'd', 'v', 'j', 'n', 't', 'l', 'u']);

const toHex = bytes =>
  bytes
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

const encodeScriptNum = value => {
  let num = Number(value);
  if (!Number.isInteger(num)) {
    throw new Error(`Invalid script number: ${value}`);
  }
  if (num === 0) return [];
  if (num < 0) {
    throw new Error(`Negative numbers not supported: ${value}`);
  }
  const result = [];
  while (num > 0) {
    result.push(num & 0xff);
    num >>= 8;
  }
  if (result[result.length - 1] & 0x80) {
    result.push(0x00);
  }
  return result;
};

const formatNumber = value => {
  const num = Number(value);
  if (!Number.isInteger(num)) {
    throw new Error(`Invalid script number: ${value}`);
  }
  if (num >= 0 && num <= 16) return String(num);
  const bytes = encodeScriptNum(num);
  return `<${toHex(bytes)}>`;
};

const verifyOpcodes = new Map([
  ['OP_CHECKSIG', 'OP_CHECKSIGVERIFY'],
  ['OP_CHECKMULTISIG', 'OP_CHECKMULTISIGVERIFY'],
  ['OP_EQUAL', 'OP_EQUALVERIFY'],
  ['OP_NUMEQUAL', 'OP_NUMEQUALVERIFY']
]);
const verifyOpcodeValues = new Set([...verifyOpcodes.values(), 'OP_VERIFY']);

const applyVerify = script => {
  if (!script.length) return ['OP_VERIFY'];
  const last = script[script.length - 1];
  if (verifyOpcodeValues.has(last)) {
    return script;
  }
  if (verifyOpcodes.has(last)) {
    return [...script.slice(0, -1), verifyOpcodes.get(last)];
  }
  return [...script, 'OP_VERIFY'];
};

const splitArgs = args => {
  if (!args) return [];
  const result = [];
  let level = 0;
  let last = 0;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '(') level++;
    if (args[i] === ')') level--;
    if (level === 0 && args[i] === ',') {
      result.push(args.substring(last, i));
      last = i + 1;
    }
  }
  result.push(args.substring(last));
  return result.map(arg => arg.trim()).filter(Boolean);
};

const wrapNode = (wrapper, node) => {
  switch (wrapper) {
    case 'a':
    case 's':
    case 'c':
    case 'd':
    case 'v':
    case 'j':
    case 'n':
      return { type: wrapper, arg: node };
    case 't':
      return { type: 'and_v', args: [node, { type: '1' }] };
    case 'l':
      return { type: 'or_i', args: [{ type: '0' }, node] };
    case 'u':
      return { type: 'or_i', args: [node, { type: '0' }] };
    default:
      throw new Error(`Unknown wrapper: ${wrapper}`);
  }
};

const parseBase = expression => {
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
      if (args.length !== 1) throw new Error(`Invalid pk() args: ${expression}`);
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
        args: [parseExpression(args[0]), parseExpression(args[1]), { type: '0' }]
      };
    }
    case 'pk_k':
    case 'pk_h':
    case 'older':
    case 'after':
    case 'sha256':
    case 'ripemd160':
    case 'hash256':
    case 'hash160': {
      if (args.length !== 1)
        throw new Error(`Invalid ${name}() args: ${expression}`);
      const key = name === 'pk_k' || name === 'pk_h' ? args[0] : undefined;
      const value = key ? undefined : args[0];
      return { type: name, key, value };
    }
    case 'multi': {
      if (args.length < 2) throw new Error(`Invalid multi() args: ${expression}`);
      return { type: 'multi', k: args[0], keys: args.slice(1) };
    }
    case 'thresh': {
      if (args.length < 2) throw new Error(`Invalid thresh() args: ${expression}`);
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

const parseExpression = input => {
  if (typeof input !== 'string') {
    throw new Error(`Invalid miniscript expression: ${input}`);
  }
  let expression = input.trim();
  const wrappers = [];
  while (true) {
    const match = expression.match(/^([a-z]+):/);
    if (!match) break;
    const prefix = match[1];
    if (![...prefix].every(char => wrapperChars.has(char))) break;
    wrappers.push(...prefix.split(''));
    expression = expression.slice(prefix.length + 1);
  }

  let node = parseBase(expression);
  for (let i = wrappers.length - 1; i >= 0; i--) {
    node = wrapNode(wrappers[i], node);
  }
  return node;
};

const compileNode = (node, verify = false) => {
  switch (node.type) {
    case '0':
    case '1':
      return [node.type];
    case 'pk_k':
      return [`<${node.key}>`];
    case 'pk_h':
      return ['OP_DUP', 'OP_HASH160', `<HASH160(${node.key})>`, 'OP_EQUALVERIFY'];
    case 'older':
      return [formatNumber(node.value), 'OP_CHECKSEQUENCEVERIFY'];
    case 'after':
      return [formatNumber(node.value), 'OP_CHECKLOCKTIMEVERIFY'];
    case 'sha256':
      return [
        'OP_SIZE',
        formatNumber(32),
        'OP_EQUALVERIFY',
        'OP_SHA256',
        `<${node.value}>`,
        verify ? 'OP_EQUALVERIFY' : 'OP_EQUAL'
      ];
    case 'ripemd160':
      return [
        'OP_SIZE',
        formatNumber(32),
        'OP_EQUALVERIFY',
        'OP_RIPEMD160',
        `<${node.value}>`,
        verify ? 'OP_EQUALVERIFY' : 'OP_EQUAL'
      ];
    case 'hash256':
      return [
        'OP_SIZE',
        formatNumber(32),
        'OP_EQUALVERIFY',
        'OP_HASH256',
        `<${node.value}>`,
        verify ? 'OP_EQUALVERIFY' : 'OP_EQUAL'
      ];
    case 'hash160':
      return [
        'OP_SIZE',
        formatNumber(32),
        'OP_EQUALVERIFY',
        'OP_HASH160',
        `<${node.value}>`,
        verify ? 'OP_EQUALVERIFY' : 'OP_EQUAL'
      ];
    case 'a':
      return [
        'OP_TOALTSTACK',
        ...compileNode(node.arg, false),
        'OP_FROMALTSTACK'
      ];
    case 's':
      return ['OP_SWAP', ...compileNode(node.arg, verify)];
    case 'c':
      return [
        ...compileNode(node.arg, false),
        verify ? 'OP_CHECKSIGVERIFY' : 'OP_CHECKSIG'
      ];
    case 'd':
      return ['OP_DUP', 'OP_IF', ...compileNode(node.arg, false), 'OP_ENDIF'];
    case 'v':
      return applyVerify(compileNode(node.arg, true));
    case 'j':
      return [
        'OP_SIZE',
        'OP_0NOTEQUAL',
        'OP_IF',
        ...compileNode(node.arg, false),
        'OP_ENDIF'
      ];
    case 'n':
      return [...compileNode(node.arg, false), 'OP_0NOTEQUAL'];
    case 'and_v':
      return [
        ...compileNode(node.args[0], false),
        ...compileNode(node.args[1], verify)
      ];
    case 'and_b':
      return [
        ...compileNode(node.args[0], false),
        ...compileNode(node.args[1], false),
        'OP_BOOLAND'
      ];
    case 'or_b':
      return [
        ...compileNode(node.args[0], false),
        ...compileNode(node.args[1], false),
        'OP_BOOLOR'
      ];
    case 'or_c':
      return [
        ...compileNode(node.args[0], false),
        'OP_NOTIF',
        ...compileNode(node.args[1], false),
        'OP_ENDIF'
      ];
    case 'or_d':
      return [
        ...compileNode(node.args[0], false),
        'OP_IFDUP',
        'OP_NOTIF',
        ...compileNode(node.args[1], false),
        'OP_ENDIF'
      ];
    case 'or_i':
      return [
        'OP_IF',
        ...compileNode(node.args[0], false),
        'OP_ELSE',
        ...compileNode(node.args[1], false),
        'OP_ENDIF'
      ];
    case 'andor':
      return [
        ...compileNode(node.args[0], false),
        'OP_NOTIF',
        ...compileNode(node.args[2], false),
        'OP_ELSE',
        ...compileNode(node.args[1], false),
        'OP_ENDIF'
      ];
    case 'thresh': {
      if (!node.subs.length) return [];
      let script = [...compileNode(node.subs[0], false)];
      for (let i = 1; i < node.subs.length; i++) {
        script = [...script, ...compileNode(node.subs[i], false), 'OP_ADD'];
      }
      script.push(formatNumber(node.k));
      script.push(verify ? 'OP_EQUALVERIFY' : 'OP_EQUAL');
      return script;
    }
    case 'multi': {
      const script = [formatNumber(node.k)];
      node.keys.forEach(key => {
        script.push(`<${key}>`);
      });
      script.push(formatNumber(node.keys.length));
      script.push(verify ? 'OP_CHECKMULTISIGVERIFY' : 'OP_CHECKMULTISIG');
      return script;
    }
    default:
      throw new Error(`Unknown miniscript node: ${node.type}`);
  }
};

export const compileMiniscriptJs = miniscript => {
  const node = parseExpression(miniscript);
  const asm = compileNode(node, false).join(' ');
  return {
    asm: cleanAsm(asm)
  };
};
