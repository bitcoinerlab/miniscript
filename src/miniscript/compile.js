/**
 * Miniscript AST to ASM compiler.
 * See ANALYZER.md for AST details.
 */

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

/**
 * Compile a Miniscript AST node to ASM tokens.
 * @param {object} node
 * @param {boolean} verify
 * @returns {string[]}
 */
export const compileNode = (node, verify = false) => {
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
    case 'multi_a': {
      if (!node.keys.length) return [];
      const script = [`<${node.keys[0]}>`, 'OP_CHECKSIG'];
      for (let i = 1; i < node.keys.length; i++) {
        script.push(`<${node.keys[i]}>`, 'OP_CHECKSIGADD');
      }
      script.push(formatNumber(node.k));
      script.push(verify ? 'OP_NUMEQUALVERIFY' : 'OP_NUMEQUAL');
      return script;
    }
    default:
      throw new Error(`Unknown miniscript node: ${node.type}`);
  }
};
