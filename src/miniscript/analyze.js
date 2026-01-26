// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

/**
 * Miniscript static analysis (type system, malleability, timelock mixing).
 * See ANALYZER.md for the full flow.
 */

import bip68 from 'bip68';
import { parseExpression } from './parse.js';
import {
  makeType,
  BasicType,
  falseCorrectness,
  hashCorrectness,
  multiCorrectness,
  multiACorrectness,
  pkHCorrectness,
  pkKCorrectness,
  timeCorrectness,
  trueCorrectness,
  falseMalleability,
  hashMalleability,
  checkMalleability,
  multiMalleability,
  nonZeroMalleability,
  pkMalleability,
  timeMalleability,
  trueMalleability,
  altCorrectness,
  checkCorrectness,
  dupIfWshCorrectness,
  dupIfTapscriptCorrectness,
  nonZeroCorrectness,
  swapCorrectness,
  verifyCorrectness,
  zeroNotEqualCorrectness,
  andBCorrectness,
  andBMalleability,
  andOrCorrectness,
  andOrMalleability,
  andVCorrectness,
  andVMalleability,
  orBCorrectness,
  orBMalleability,
  orCCorrectness,
  orCMalleability,
  orDCorrectness,
  orDMalleability,
  orICorrectness,
  orIMalleability,
  threshCorrectness,
  thresholdMalleability,
  dupIfMalleability,
  verifyMalleability
} from './types/index.js';


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

const makeValidResult = ({ type, timelockInfo, keys, hasDuplicateKeys }) => ({
  valid: true,
  type,
  timelockInfo,
  keys,
  hasDuplicateKeys
});

const makeInvalidResult = error => ({
  valid: false,
  error,
  type: null,
  timelockInfo: newTimelockInfo(),
  keys: new Set(),
  hasDuplicateKeys: false
});

/**
 * Merge key sets and detect duplicates across two subtrees.
 * @param {{keys: Set<string>, hasDuplicateKeys: boolean}} left
 * @param {{keys: Set<string>, hasDuplicateKeys: boolean}} right
 * @returns {{keys: Set<string>, hasDuplicateKeys: boolean}}
 */
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
      const correctnessResult = falseCorrectness();
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(correctnessResult.correctness, falseMalleability),
        timelockInfo: newTimelockInfo(),
        keys: new Set(),
        hasDuplicateKeys: false
      });
    }
    case '1': {
      const correctnessResult = trueCorrectness();
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(correctnessResult.correctness, trueMalleability),
        timelockInfo: newTimelockInfo(),
        keys: new Set(),
        hasDuplicateKeys: false
      });
    }
    case 'pk_k': {
      const correctnessResult = pkKCorrectness();
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(correctnessResult.correctness, pkMalleability()),
        timelockInfo: newTimelockInfo(),
        keys: new Set([node.key]),
        hasDuplicateKeys: false
      });
    }
    case 'pk_h': {
      const correctnessResult = pkHCorrectness();
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(correctnessResult.correctness, pkMalleability()),
        timelockInfo: newTimelockInfo(),
        keys: new Set([node.key]),
        hasDuplicateKeys: false
      });
    }
    case 'sha256':
    case 'ripemd160':
    case 'hash256':
    case 'hash160': {
      const correctnessResult = hashCorrectness();
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(correctnessResult.correctness, hashMalleability()),
        timelockInfo: newTimelockInfo(),
        keys: new Set(),
        hasDuplicateKeys: false
      });
    }
    case 'after': {
      const parsed = parseInteger(node.value, 'after');
      if (!parsed.ok) return makeInvalidResult(parsed.error);
      if (parsed.value < 1 || parsed.value >= 2 ** 31) {
        return makeInvalidResult(`after() value out of range: ${node.value}`);
      }
      const timelockInfo = newTimelockInfo();
      if (parsed.value < 500000000) timelockInfo.cltv_with_height = true;
      else timelockInfo.cltv_with_time = true;
      const correctnessResult = timeCorrectness();
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(correctnessResult.correctness, timeMalleability()),
        timelockInfo,
        keys: new Set(),
        hasDuplicateKeys: false
      });
    }
    case 'older': {
      const parsed = parseInteger(node.value, 'older');
      if (!parsed.ok) return makeInvalidResult(parsed.error);
      if (parsed.value < 1 || parsed.value >= 2 ** 31) {
        return makeInvalidResult(`older() value out of range: ${node.value}`);
      }
      const decoded = bip68.decode(parsed.value);
      if (!decoded.hasOwnProperty('seconds') && !decoded.hasOwnProperty('blocks')) {
        return makeInvalidResult(`Invalid bip68 encoded value: ${node.value}`);
      }
      const timelockInfo = newTimelockInfo();
      if (decoded.hasOwnProperty('seconds')) timelockInfo.csv_with_time = true;
      if (decoded.hasOwnProperty('blocks')) timelockInfo.csv_with_height = true;
      const correctnessResult = timeCorrectness();
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(correctnessResult.correctness, timeMalleability()),
        timelockInfo,
        keys: new Set(),
        hasDuplicateKeys: false
      });
    }
    case 'multi': {
      if (ctx.tapscript) return makeInvalidResult('multi() is not valid in tapscript');
      const parsed = parseInteger(node.k, 'multi');
      if (!parsed.ok) return makeInvalidResult(parsed.error);
      if (parsed.value < 1 || parsed.value > node.keys.length) {
        return makeInvalidResult(`multi() k out of range: ${node.k}`);
      }
      const keys = new Set();
      let hasDuplicateKeys = false;
      node.keys.forEach(key => {
        if (keys.has(key)) hasDuplicateKeys = true;
        keys.add(key);
      });
      const correctnessResult = multiCorrectness();
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(correctnessResult.correctness, multiMalleability()),
        timelockInfo: newTimelockInfo(),
        keys,
        hasDuplicateKeys
      });
    }
    case 'multi_a': {
      if (!ctx.tapscript) return makeInvalidResult('multi_a() is only valid in tapscript');
      const parsed = parseInteger(node.k, 'multi_a');
      if (!parsed.ok) return makeInvalidResult(parsed.error);
      if (parsed.value < 1 || parsed.value > node.keys.length) {
        return makeInvalidResult(`multi_a() k out of range: ${node.k}`);
      }
      const keys = new Set();
      let hasDuplicateKeys = false;
      node.keys.forEach(key => {
        if (keys.has(key)) hasDuplicateKeys = true;
        keys.add(key);
      });
      const correctnessResult = multiACorrectness();
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(correctnessResult.correctness, multiMalleability()),
        timelockInfo: newTimelockInfo(),
        keys,
        hasDuplicateKeys
      });
    }
    case 'a': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const correctnessResult = altCorrectness(child.type.correctness);
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(correctnessResult.correctness, child.type.malleability),
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 's': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const correctnessResult = swapCorrectness(child.type.correctness);
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(correctnessResult.correctness, child.type.malleability),
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 'c': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const correctnessResult = checkCorrectness(child.type.correctness);
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(
          correctnessResult.correctness,
          checkMalleability(child.type.malleability)
        ),
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 'd': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const correctnessResult = ctx.tapscript
        ? dupIfTapscriptCorrectness(child.type.correctness)
        : dupIfWshCorrectness(child.type.correctness);
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(
          correctnessResult.correctness,
          dupIfMalleability(child.type.malleability)
        ),
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 'v': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const correctnessResult = verifyCorrectness(child.type.correctness);
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(
          correctnessResult.correctness,
          verifyMalleability(child.type.malleability)
        ),
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 'j': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const correctnessResult = nonZeroCorrectness(child.type.correctness);
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(
          correctnessResult.correctness,
          nonZeroMalleability(child.type.malleability)
        ),
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 'n': {
      const child = analyzeNode(node.arg, ctx);
      if (!child.valid) return child;
      const correctnessResult = zeroNotEqualCorrectness(child.type.correctness);
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        type: makeType(
          correctnessResult.correctness,
          child.type.malleability
        ),
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 'and_v': {
      const left = analyzeNode(node.args[0], ctx);
      const right = analyzeNode(node.args[1], ctx);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const correctnessResult = andVCorrectness(
        left.type.correctness,
        right.type.correctness
      );
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      const keysResult = mergeKeySets(left, right);
      return makeValidResult({
        type: makeType(
          correctnessResult.correctness,
          andVMalleability(left.type.malleability, right.type.malleability)
        ),
        timelockInfo: combineAndTimelocks(left.timelockInfo, right.timelockInfo),
        keys: keysResult.keys,
        hasDuplicateKeys: keysResult.hasDuplicateKeys
      });
    }
    case 'and_b': {
      const left = analyzeNode(node.args[0], ctx);
      const right = analyzeNode(node.args[1], ctx);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const correctnessResult = andBCorrectness(
        left.type.correctness,
        right.type.correctness
      );
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      const keysResult = mergeKeySets(left, right);
      return makeValidResult({
        type: makeType(
          correctnessResult.correctness,
          andBMalleability(left.type.malleability, right.type.malleability)
        ),
        timelockInfo: combineAndTimelocks(left.timelockInfo, right.timelockInfo),
        keys: keysResult.keys,
        hasDuplicateKeys: keysResult.hasDuplicateKeys
      });
    }
    case 'or_b': {
      const left = analyzeNode(node.args[0], ctx);
      const right = analyzeNode(node.args[1], ctx);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const correctnessResult = orBCorrectness(
        left.type.correctness,
        right.type.correctness
      );
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      const keysResult = mergeKeySets(left, right);
      return makeValidResult({
        type: makeType(
          correctnessResult.correctness,
          orBMalleability(left.type.malleability, right.type.malleability)
        ),
        timelockInfo: combineOrTimelocks(left.timelockInfo, right.timelockInfo),
        keys: keysResult.keys,
        hasDuplicateKeys: keysResult.hasDuplicateKeys
      });
    }
    case 'or_c': {
      const left = analyzeNode(node.args[0], ctx);
      const right = analyzeNode(node.args[1], ctx);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const correctnessResult = orCCorrectness(
        left.type.correctness,
        right.type.correctness
      );
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      const keysResult = mergeKeySets(left, right);
      return makeValidResult({
        type: makeType(
          correctnessResult.correctness,
          orCMalleability(left.type.malleability, right.type.malleability)
        ),
        timelockInfo: combineOrTimelocks(left.timelockInfo, right.timelockInfo),
        keys: keysResult.keys,
        hasDuplicateKeys: keysResult.hasDuplicateKeys
      });
    }
    case 'or_d': {
      const left = analyzeNode(node.args[0], ctx);
      const right = analyzeNode(node.args[1], ctx);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const correctnessResult = orDCorrectness(
        left.type.correctness,
        right.type.correctness
      );
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      const keysResult = mergeKeySets(left, right);
      return makeValidResult({
        type: makeType(
          correctnessResult.correctness,
          orDMalleability(left.type.malleability, right.type.malleability)
        ),
        timelockInfo: combineOrTimelocks(left.timelockInfo, right.timelockInfo),
        keys: keysResult.keys,
        hasDuplicateKeys: keysResult.hasDuplicateKeys
      });
    }
    case 'or_i': {
      const left = analyzeNode(node.args[0], ctx);
      const right = analyzeNode(node.args[1], ctx);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const correctnessResult = orICorrectness(
        left.type.correctness,
        right.type.correctness
      );
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      const keysResult = mergeKeySets(left, right);
      return makeValidResult({
        type: makeType(
          correctnessResult.correctness,
          orIMalleability(left.type.malleability, right.type.malleability)
        ),
        timelockInfo: combineOrTimelocks(left.timelockInfo, right.timelockInfo),
        keys: keysResult.keys,
        hasDuplicateKeys: keysResult.hasDuplicateKeys
      });
    }
    case 'andor': {
      const left = analyzeNode(node.args[0], ctx);
      const mid = analyzeNode(node.args[1], ctx);
      const right = analyzeNode(node.args[2], ctx);
      if (!left.valid) return left;
      if (!mid.valid) return mid;
      if (!right.valid) return right;
      const correctnessResult = andOrCorrectness(
        left.type.correctness,
        mid.type.correctness,
        right.type.correctness
      );
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      const leftMidKeys = mergeKeySets(left, mid);
      const allKeys = mergeKeySets({ ...leftMidKeys, valid: true }, right);
      const combinedTimelocks = combineOrTimelocks(
        combineAndTimelocks(left.timelockInfo, mid.timelockInfo),
        right.timelockInfo
      );
      return makeValidResult({
        type: makeType(
          correctnessResult.correctness,
          andOrMalleability(
            left.type.malleability,
            mid.type.malleability,
            right.type.malleability
          )
        ),
        timelockInfo: combinedTimelocks,
        keys: allKeys.keys,
        hasDuplicateKeys: allKeys.hasDuplicateKeys
      });
    }
    case 'thresh': {
      const parsed = parseInteger(node.k, 'thresh');
      if (!parsed.ok) return makeInvalidResult(parsed.error);
      const k = parsed.value;
      if (k < 1 || k > node.subs.length) {
        return makeInvalidResult(`thresh() k out of range: ${node.k}`);
      }
      const subs = node.subs.map(sub => analyzeNode(sub, ctx));
      const invalidSub = subs.find(sub => !sub.valid);
      if (invalidSub) return invalidSub;
      const correctnessResult = threshCorrectness(
        k,
        subs.map(sub => sub.type.correctness)
      );
      if (!correctnessResult.ok) return makeInvalidResult(correctnessResult.error);
      const timelocks = combineThresholdTimelocks(
        k,
        subs.map(sub => sub.timelockInfo)
      );
      const mergedKeys = subs.reduce(
        (acc, sub) => mergeKeySets(acc, sub),
        { keys: new Set(), hasDuplicateKeys: false }
      );
      return makeValidResult({
        type: makeType(
          correctnessResult.correctness,
          thresholdMalleability(k, subs.map(sub => sub.type.malleability))
        ),
        timelockInfo: timelocks,
        keys: mergedKeys.keys,
        hasDuplicateKeys: mergedKeys.hasDuplicateKeys
      });
    }
    default:
      return makeInvalidResult(`Unknown miniscript node: ${node.type}`);
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

  const needsSignature = analysis.type.malleability.signed;
  const nonMalleable = analysis.type.malleability.nonMalleable;
  const timelockMix = analysis.timelockInfo.contains_combination;
  const hasDuplicateKeys = analysis.hasDuplicateKeys;
  const issanesublevel =
    needsSignature && nonMalleable && !timelockMix && !hasDuplicateKeys;
  const issane = issanesublevel && analysis.type.correctness.basicType === BasicType.B;
  let error = null;
  if (!needsSignature) error = 'SiglessBranch';
  else if (!nonMalleable) error = 'Malleable';
  else if (hasDuplicateKeys) error = 'RepeatedPubkeys';
  else if (timelockMix) error = 'HeightTimelockCombination';
  else if (analysis.type.correctness.basicType !== BasicType.B) error = 'NonTopLevel';

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
