/**
 * Miniscript static analysis (type system, malleability, timelock mixing).
 * See ANALYZER.md for the full flow.
 */

import bip68 from 'bip68';
import { parseExpression } from './parse.js';
import {
  Base,
  correctnessFalse,
  correctnessHash,
  correctnessMulti,
  correctnessMultiA,
  correctnessPkH,
  correctnessPkK,
  correctnessTime,
  correctnessTrue,
  malleabilityFalse,
  malleabilityHash,
  malleabilityMulti,
  malleabilityPk,
  malleabilityTime,
  malleabilityTrue,
  makeType,
  castAlt,
  castCheck,
  castDupIf,
  castNonZero,
  castSwap,
  castVerify,
  castZeroNotEqual,
  correctnessAndB,
  andBMalleability,
  correctnessAndOr,
  andOrMalleability,
  correctnessAndV,
  andVMalleability,
  correctnessOrB,
  orBMalleability,
  correctnessOrC,
  orCMalleability,
  correctnessOrD,
  orDMalleability,
  correctnessOrI,
  orIMalleability,
  correctnessThresh,
  thresholdMalleability,
  castMalleabilityDupIf,
  castMalleabilityVerify
} from './types.js';

/**
 * Create an empty timelock info record.
 * @returns {object}
 */
const newTimelockInfo = () => ({
  csv_with_height: false,
  csv_with_time: false,
  cltv_with_height: false,
  cltv_with_time: false,
  contains_combination: false
});

/**
 * Combine timelock info for threshold combinators.
 * @param {number} k
 * @param {object[]} infos
 * @returns {object}
 */
const combineThresholdTimelocks = (k, infos) =>
  infos.reduce((acc, info) => {
    if (k > 1) {
      const heightAndTime =
        (acc.csv_with_height && info.csv_with_time) ||
        (acc.csv_with_time && info.csv_with_height) ||
        (acc.cltv_with_time && info.cltv_with_height) ||
        (acc.cltv_with_height && info.cltv_with_time);
      acc.contains_combination ||= heightAndTime;
    }
    acc.csv_with_height ||= info.csv_with_height;
    acc.csv_with_time ||= info.csv_with_time;
    acc.cltv_with_height ||= info.cltv_with_height;
    acc.cltv_with_time ||= info.cltv_with_time;
    acc.contains_combination ||= info.contains_combination;
    return acc;
  }, newTimelockInfo());

const combineAndTimelocks = (left, right) =>
  combineThresholdTimelocks(2, [left, right]);

const combineOrTimelocks = (left, right) =>
  combineThresholdTimelocks(1, [left, right]);

const parseInteger = (value, label) => {
  const num = Number(value);
  if (!Number.isInteger(num)) {
    return { ok: false, error: `${label} must be an integer: ${value}` };
  }
  return { ok: true, value: num };
};

const makeResult = (type, timelockInfo, keys, hasDuplicateKeys) => ({
  valid: true,
  type,
  timelockInfo,
  keys,
  hasDuplicateKeys
});

const invalidResult = error => ({
  valid: false,
  error,
  type: null,
  timelockInfo: newTimelockInfo(),
  keys: new Set(),
  hasDuplicateKeys: false
});

const mergeKeySets = (left, right) => {
  const keys = new Set(left.keys);
  let hasDuplicateKeys = left.hasDuplicateKeys || right.hasDuplicateKeys;
  for (const key of right.keys) {
    if (keys.has(key)) hasDuplicateKeys = true;
    keys.add(key);
  }
  return { keys, hasDuplicateKeys };
};

/**
 * Analyze a parsed Miniscript node and return static type info.
 * @param {object} node
 * @param {{tapscript: boolean}} ctx
 * @returns {object}
 */
const analyzeNode = (node, ctx) => {
  switch (node.type) {
    case '0': {
      const corr = correctnessFalse();
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, malleabilityFalse),
        newTimelockInfo(),
        new Set(),
        false
      );
    }
    case '1': {
      const corr = correctnessTrue();
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, malleabilityTrue),
        newTimelockInfo(),
        new Set(),
        false
      );
    }
    case 'pk_k': {
      const corr = correctnessPkK();
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, malleabilityPk()),
        newTimelockInfo(),
        new Set([node.key]),
        false
      );
    }
    case 'pk_h': {
      const corr = correctnessPkH();
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, malleabilityPk()),
        newTimelockInfo(),
        new Set([node.key]),
        false
      );
    }
    case 'sha256':
    case 'ripemd160':
    case 'hash256':
    case 'hash160': {
      const corr = correctnessHash();
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, malleabilityHash()),
        newTimelockInfo(),
        new Set(),
        false
      );
    }
    case 'after': {
      const parsed = parseInteger(node.value, 'after');
      if (!parsed.ok) return invalidResult(parsed.error);
      if (parsed.value < 1 || parsed.value >= 2 ** 31) {
        return invalidResult(`after() value out of range: ${node.value}`);
      }
      const timelockInfo = newTimelockInfo();
      if (parsed.value < 500000000) timelockInfo.cltv_with_height = true;
      else timelockInfo.cltv_with_time = true;
      const corr = correctnessTime();
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, malleabilityTime()),
        timelockInfo,
        new Set(),
        false
      );
    }
    case 'older': {
      const parsed = parseInteger(node.value, 'older');
      if (!parsed.ok) return invalidResult(parsed.error);
      if (parsed.value < 1 || parsed.value >= 2 ** 31) {
        return invalidResult(`older() value out of range: ${node.value}`);
      }
      const decoded = bip68.decode(parsed.value);
      if (!decoded.hasOwnProperty('seconds') && !decoded.hasOwnProperty('blocks')) {
        return invalidResult(`Invalid bip68 encoded value: ${node.value}`);
      }
      const timelockInfo = newTimelockInfo();
      if (decoded.hasOwnProperty('seconds')) timelockInfo.csv_with_time = true;
      if (decoded.hasOwnProperty('blocks')) timelockInfo.csv_with_height = true;
      const corr = correctnessTime();
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, malleabilityTime()),
        timelockInfo,
        new Set(),
        false
      );
    }
    case 'multi': {
      if (ctx.tapscript) return invalidResult('multi() is not valid in tapscript');
      const parsed = parseInteger(node.k, 'multi');
      if (!parsed.ok) return invalidResult(parsed.error);
      if (parsed.value < 1 || parsed.value > node.keys.length) {
        return invalidResult(`multi() k out of range: ${node.k}`);
      }
      const keys = new Set();
      let hasDuplicateKeys = false;
      node.keys.forEach(key => {
        if (keys.has(key)) hasDuplicateKeys = true;
        keys.add(key);
      });
      const corr = correctnessMulti();
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, malleabilityMulti()),
        newTimelockInfo(),
        keys,
        hasDuplicateKeys
      );
    }
    case 'multi_a': {
      if (!ctx.tapscript) return invalidResult('multi_a() is only valid in tapscript');
      const parsed = parseInteger(node.k, 'multi_a');
      if (!parsed.ok) return invalidResult(parsed.error);
      if (parsed.value < 1 || parsed.value > node.keys.length) {
        return invalidResult(`multi_a() k out of range: ${node.k}`);
      }
      const keys = new Set();
      let hasDuplicateKeys = false;
      node.keys.forEach(key => {
        if (keys.has(key)) hasDuplicateKeys = true;
        keys.add(key);
      });
      const corr = correctnessMultiA();
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, malleabilityMulti()),
        newTimelockInfo(),
        keys,
        hasDuplicateKeys
      );
    }
    case 'a': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const corr = castAlt(child.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, child.type.mall),
        child.timelockInfo,
        child.keys,
        child.hasDuplicateKeys
      );
    }
    case 's': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const corr = castSwap(child.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, child.type.mall),
        child.timelockInfo,
        child.keys,
        child.hasDuplicateKeys
      );
    }
    case 'c': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const corr = castCheck(child.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, child.type.mall),
        child.timelockInfo,
        child.keys,
        child.hasDuplicateKeys
      );
    }
    case 'd': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const corr = castDupIf(child.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, castMalleabilityDupIf(child.type.mall)),
        child.timelockInfo,
        child.keys,
        child.hasDuplicateKeys
      );
    }
    case 'v': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const corr = castVerify(child.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, castMalleabilityVerify(child.type.mall)),
        child.timelockInfo,
        child.keys,
        child.hasDuplicateKeys
      );
    }
    case 'j': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const corr = castNonZero(child.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, castMalleabilityDupIf(child.type.mall)),
        child.timelockInfo,
        child.keys,
        child.hasDuplicateKeys
      );
    }
    case 'n': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const corr = castZeroNotEqual(child.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      return makeResult(
        makeType(corr.corr, child.type.mall),
        child.timelockInfo,
        child.keys,
        child.hasDuplicateKeys
      );
    }
    case 'and_v': {
      const left = analyzeNode(node.args[0], ctx);
      const right = analyzeNode(node.args[1], ctx);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const corr = correctnessAndV(left.type.corr, right.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      const keysResult = mergeKeySets(left, right);
      return makeResult(
        makeType(corr.corr, andVMalleability(left.type.mall, right.type.mall)),
        combineAndTimelocks(left.timelockInfo, right.timelockInfo),
        keysResult.keys,
        keysResult.hasDuplicateKeys
      );
    }
    case 'and_b': {
      const left = analyzeNode(node.args[0], ctx);
      const right = analyzeNode(node.args[1], ctx);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const corr = correctnessAndB(left.type.corr, right.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      const keysResult = mergeKeySets(left, right);
      return makeResult(
        makeType(corr.corr, andBMalleability(left.type.mall, right.type.mall)),
        combineAndTimelocks(left.timelockInfo, right.timelockInfo),
        keysResult.keys,
        keysResult.hasDuplicateKeys
      );
    }
    case 'or_b': {
      const left = analyzeNode(node.args[0], ctx);
      const right = analyzeNode(node.args[1], ctx);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const corr = correctnessOrB(left.type.corr, right.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      const keysResult = mergeKeySets(left, right);
      return makeResult(
        makeType(corr.corr, orBMalleability(left.type.mall, right.type.mall)),
        combineOrTimelocks(left.timelockInfo, right.timelockInfo),
        keysResult.keys,
        keysResult.hasDuplicateKeys
      );
    }
    case 'or_c': {
      const left = analyzeNode(node.args[0], ctx);
      const right = analyzeNode(node.args[1], ctx);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const corr = correctnessOrC(left.type.corr, right.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      const keysResult = mergeKeySets(left, right);
      return makeResult(
        makeType(corr.corr, orCMalleability(left.type.mall, right.type.mall)),
        combineOrTimelocks(left.timelockInfo, right.timelockInfo),
        keysResult.keys,
        keysResult.hasDuplicateKeys
      );
    }
    case 'or_d': {
      const left = analyzeNode(node.args[0], ctx);
      const right = analyzeNode(node.args[1], ctx);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const corr = correctnessOrD(left.type.corr, right.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      const keysResult = mergeKeySets(left, right);
      return makeResult(
        makeType(corr.corr, orDMalleability(left.type.mall, right.type.mall)),
        combineOrTimelocks(left.timelockInfo, right.timelockInfo),
        keysResult.keys,
        keysResult.hasDuplicateKeys
      );
    }
    case 'or_i': {
      const left = analyzeNode(node.args[0], ctx);
      const right = analyzeNode(node.args[1], ctx);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const corr = correctnessOrI(left.type.corr, right.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      const keysResult = mergeKeySets(left, right);
      return makeResult(
        makeType(corr.corr, orIMalleability(left.type.mall, right.type.mall)),
        combineOrTimelocks(left.timelockInfo, right.timelockInfo),
        keysResult.keys,
        keysResult.hasDuplicateKeys
      );
    }
    case 'andor': {
      const left = analyzeNode(node.args[0], ctx);
      const mid = analyzeNode(node.args[1], ctx);
      const right = analyzeNode(node.args[2], ctx);
      if (!left.valid) return left;
      if (!mid.valid) return mid;
      if (!right.valid) return right;
      const corr = correctnessAndOr(left.type.corr, mid.type.corr, right.type.corr);
      if (!corr.ok) return invalidResult(corr.error);
      const leftMidKeys = mergeKeySets(left, mid);
      const allKeys = mergeKeySets({ ...leftMidKeys, valid: true }, right);
      const combinedTimelocks = combineOrTimelocks(
        combineAndTimelocks(left.timelockInfo, mid.timelockInfo),
        right.timelockInfo
      );
      return makeResult(
        makeType(corr.corr, andOrMalleability(left.type.mall, mid.type.mall, right.type.mall)),
        combinedTimelocks,
        allKeys.keys,
        allKeys.hasDuplicateKeys
      );
    }
    case 'thresh': {
      const parsed = parseInteger(node.k, 'thresh');
      if (!parsed.ok) return invalidResult(parsed.error);
      const k = parsed.value;
      if (k < 1 || k > node.subs.length) {
        return invalidResult(`thresh() k out of range: ${node.k}`);
      }
      const subs = node.subs.map(sub => analyzeNode(sub, ctx));
      const invalidSub = subs.find(sub => !sub.valid);
      if (invalidSub) return invalidSub;
      const corr = correctnessThresh(k, subs.map(sub => sub.type.corr));
      if (!corr.ok) return invalidResult(corr.error);
      const timelocks = combineThresholdTimelocks(
        k,
        subs.map(sub => sub.timelockInfo)
      );
      const mergedKeys = subs.reduce(
        (acc, sub) => mergeKeySets(acc, sub),
        { keys: new Set(), hasDuplicateKeys: false }
      );
      return makeResult(
        makeType(corr.corr, thresholdMalleability(k, subs.map(sub => sub.type.mall))),
        timelocks,
        mergedKeys.keys,
        mergedKeys.hasDuplicateKeys
      );
    }
    default:
      return invalidResult(`Unknown miniscript node: ${node.type}`);
  }
};

/**
 * Analyze a parsed AST node and compute issane flags.
 * @param {object} node
 * @param {{tapscript?: boolean}} options
 * @returns {object}
 */
export const analyzeParsedNode = (node, options = {}) => {
  const ctx = { tapscript: Boolean(options.tapscript) };
  const analysis = analyzeNode(node, ctx);
  if (!analysis.valid) {
    return {
      issane: false,
      issanesublevel: false,
      valid: false,
      error: analysis.error,
      needsSignature: false,
      nonMalleable: false,
      timelockMix: false,
      hasDuplicateKeys: false
    };
  }

  const needsSignature = analysis.type.mall.safe;
  const nonMalleable = analysis.type.mall.nonMalleable;
  const timelockMix = analysis.timelockInfo.contains_combination;
  const hasDuplicateKeys = analysis.hasDuplicateKeys;
  const issanesublevel =
    needsSignature && nonMalleable && !timelockMix && !hasDuplicateKeys;
  const issane = issanesublevel && analysis.type.corr.base === Base.B;
  let error = null;
  if (!needsSignature) error = 'SiglessBranch';
  else if (!nonMalleable) error = 'Malleable';
  else if (hasDuplicateKeys) error = 'RepeatedPubkeys';
  else if (timelockMix) error = 'HeightTimelockCombination';
  else if (analysis.type.corr.base !== Base.B) error = 'NonTopLevel';

  return {
    issane,
    issanesublevel,
    valid: true,
    error,
    needsSignature,
    nonMalleable,
    timelockMix,
    hasDuplicateKeys
  };
};

/**
 * Analyze a miniscript expression and return sanity flags.
 * @param {string} miniscript
 * @param {{tapscript?: boolean}} options
 * @returns {object}
 */
export const analyzeMiniscript = (miniscript, options = {}) => {
  const node = parseExpression(miniscript);
  return analyzeParsedNode(node, options);
};
