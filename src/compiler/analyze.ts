// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

/**
 * Miniscript static analysis (type system, malleability, timelock mixing).
 * See COMPILER.md for the full flow.
 */

// @ts-expect-error No types available for bip68
import bip68 from 'bip68';
import { parseExpression, type Node } from './parse';
import {
  altCorrectness,
  andBCorrectness,
  andOrCorrectness,
  andVCorrectness,
  checkCorrectness,
  dupIfTapscriptCorrectness,
  dupIfWshCorrectness,
  falseCorrectness,
  hashCorrectness,
  multiACorrectness,
  multiCorrectness,
  nonZeroCorrectness,
  orBCorrectness,
  orCCorrectness,
  orDCorrectness,
  orICorrectness,
  pkHCorrectness,
  pkKCorrectness,
  swapCorrectness,
  threshCorrectness,
  timeCorrectness,
  trueCorrectness,
  verifyCorrectness,
  zeroNotEqualCorrectness,
  type Correctness
} from './correctness';
import {
  andBMalleability,
  andOrMalleability,
  andVMalleability,
  checkMalleability,
  dupIfMalleability,
  falseMalleability,
  hashMalleability,
  multiMalleability,
  nonZeroMalleability,
  orBMalleability,
  orCMalleability,
  orDMalleability,
  orIMalleability,
  pkMalleability,
  thresholdMalleability,
  timeMalleability,
  trueMalleability,
  verifyMalleability,
  type Malleability
} from './malleability';

type TimelockInfo = {
  csv_with_height: boolean;
  csv_with_time: boolean;
  cltv_with_height: boolean;
  cltv_with_time: boolean;
  contains_combination: boolean;
};

type KeySetResult = {
  keys: Set<string>;
  hasDuplicateKeys: boolean;
};

type ParseIntegerResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

type Bip68DecodeResult = {
  seconds?: number;
  blocks?: number;
};

type ValidAnalysisResult = {
  valid: true;
  correctness: Correctness;
  malleability: Malleability;
  timelockInfo: TimelockInfo;
  keys: Set<string>;
  hasDuplicateKeys: boolean;
};

type InvalidAnalysisResult = {
  valid: false;
  error: string;
  correctness: null;
  malleability: null;
  timelockInfo: TimelockInfo;
  keys: Set<string>;
  hasDuplicateKeys: boolean;
};

type AnalysisResult = ValidAnalysisResult | InvalidAnalysisResult;

type AnalyzeContext = {
  tapscript: boolean;
};

export type AnalyzeOptions = {
  tapscript?: boolean;
};

export type ParsedAnalysisResult = {
  issane: boolean;
  issanesublevel: boolean;
  valid: boolean;
  error: string | null;
  needsSignature: boolean;
  nonMalleable: boolean;
  timelockMix: boolean;
  hasDuplicateKeys: boolean;
};

type ValidResultParams = {
  /** Correctness flags for the node. */
  correctness: Correctness;
  /** Malleability flags for the node. */
  malleability: Malleability;
  /** Aggregated timelock info. */
  timelockInfo: TimelockInfo;
  /** Set of keys used in subtree. */
  keys: Set<string>;
  /** Whether duplicate keys were found. */
  hasDuplicateKeys: boolean;
};

/** Create an empty timelock info record. */
const newTimelockInfo = (): TimelockInfo => ({
  csv_with_height: false,
  csv_with_time: false,
  cltv_with_height: false,
  cltv_with_time: false,
  contains_combination: false
});

/**
 * Combine timelock info for threshold combinators.
 *
 * Each child node reports whether it uses relative or absolute timelocks and
 * whether those timelocks are height based or time based. This function
 * aggregates those flags for the parent node.
 *
 * If threshold > 1 then multiple child nodes can be required, so mixing height
 * locks and time locks across different child nodes makes that spend path
 * impossible. We mark that as contains_combination.
 *
 * If threshold === 1 then it is a logical OR: only one child node needs to be
 * satisfied, so conflicts do not matter.
 */
const combineThresholdTimelocks = (
  /** Threshold to satisfy. */
  threshold: number,
  /** Timelock info from child nodes. */
  timelockInfos: TimelockInfo[]
): TimelockInfo => {
  const combined = newTimelockInfo();
  for (const timelockInfo of timelockInfos) {
    if (threshold > 1) {
      const heightAndTime =
        (combined.csv_with_height && timelockInfo.csv_with_time) ||
        (combined.csv_with_time && timelockInfo.csv_with_height) ||
        (combined.cltv_with_time && timelockInfo.cltv_with_height) ||
        (combined.cltv_with_height && timelockInfo.cltv_with_time);
      if (heightAndTime) combined.contains_combination = true;
    }
    if (timelockInfo.csv_with_height) combined.csv_with_height = true;
    if (timelockInfo.csv_with_time) combined.csv_with_time = true;
    if (timelockInfo.cltv_with_height) combined.cltv_with_height = true;
    if (timelockInfo.cltv_with_time) combined.cltv_with_time = true;
    if (timelockInfo.contains_combination) combined.contains_combination = true;
  }
  return combined;
};

const combineAndTimelocks = (
  left: TimelockInfo,
  right: TimelockInfo
): TimelockInfo => combineThresholdTimelocks(2, [left, right]);

const combineOrTimelocks = (
  left: TimelockInfo,
  right: TimelockInfo
): TimelockInfo => combineThresholdTimelocks(1, [left, right]);

const parseInteger = (
  /** Raw numeric string. */
  value: string,
  /** Label for error messages. */
  label: string
): ParseIntegerResult => {
  const num = Number(value);
  if (!Number.isInteger(num)) {
    return { ok: false, error: `${label} must be an integer: ${value}` };
  }
  return { ok: true, value: num };
};

const makeValidResult = ({
  correctness,
  malleability,
  timelockInfo,
  keys,
  hasDuplicateKeys
}: ValidResultParams): ValidAnalysisResult => ({
  valid: true,
  correctness,
  malleability,
  timelockInfo,
  keys,
  hasDuplicateKeys
});

const makeInvalidResult = (
  /** Error message. */
  error: string
): InvalidAnalysisResult => ({
  valid: false,
  error,
  correctness: null,
  malleability: null,
  timelockInfo: newTimelockInfo(),
  keys: new Set<string>(),
  hasDuplicateKeys: false
});

/** Merge key sets and detect duplicates across two subtrees. */
const mergeKeySets = (
  /** Left key set. */
  left: KeySetResult,
  /** Right key set. */
  right: KeySetResult
): KeySetResult => {
  const keys = new Set(left.keys);
  let hasDuplicateKeys = left.hasDuplicateKeys || right.hasDuplicateKeys;
  for (const key of right.keys) {
    if (keys.has(key)) hasDuplicateKeys = true;
    keys.add(key);
  }
  return { keys, hasDuplicateKeys };
};

/** Analyze a parsed miniscript node and return static type info. */
const analyzeNode = (
  /** Parsed miniscript node. */
  node: Node,
  /** Analysis context. */
  context: AnalyzeContext
): AnalysisResult => {
  switch (node.type) {
    case '0': {
      const correctnessResult = falseCorrectness();
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: falseMalleability,
        timelockInfo: newTimelockInfo(),
        keys: new Set<string>(),
        hasDuplicateKeys: false
      });
    }
    case '1': {
      const correctnessResult = trueCorrectness();
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: trueMalleability,
        timelockInfo: newTimelockInfo(),
        keys: new Set<string>(),
        hasDuplicateKeys: false
      });
    }
    case 'pk_k': {
      const correctnessResult = pkKCorrectness();
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: pkMalleability(),
        timelockInfo: newTimelockInfo(),
        keys: new Set<string>([node.key]),
        hasDuplicateKeys: false
      });
    }
    case 'pk_h': {
      const correctnessResult = pkHCorrectness();
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: pkMalleability(),
        timelockInfo: newTimelockInfo(),
        keys: new Set<string>([node.key]),
        hasDuplicateKeys: false
      });
    }
    case 'sha256':
    case 'ripemd160':
    case 'hash256':
    case 'hash160': {
      const correctnessResult = hashCorrectness();
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: hashMalleability(),
        timelockInfo: newTimelockInfo(),
        keys: new Set<string>(),
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
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: timeMalleability(),
        timelockInfo,
        keys: new Set<string>(),
        hasDuplicateKeys: false
      });
    }
    case 'older': {
      const parsed = parseInteger(node.value, 'older');
      if (!parsed.ok) return makeInvalidResult(parsed.error);
      if (parsed.value < 1 || parsed.value >= 2 ** 31) {
        return makeInvalidResult(`older() value out of range: ${node.value}`);
      }
      const decoded = bip68.decode(parsed.value) as Bip68DecodeResult;
      if (!('seconds' in decoded) && !('blocks' in decoded)) {
        return makeInvalidResult(`Invalid bip68 encoded value: ${node.value}`);
      }
      const timelockInfo = newTimelockInfo();
      if ('seconds' in decoded) timelockInfo.csv_with_time = true;
      if ('blocks' in decoded) timelockInfo.csv_with_height = true;
      const correctnessResult = timeCorrectness();
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: timeMalleability(),
        timelockInfo,
        keys: new Set<string>(),
        hasDuplicateKeys: false
      });
    }
    case 'multi': {
      if (context.tapscript)
        return makeInvalidResult('multi() is not valid in tapscript');
      const parsed = parseInteger(node.k, 'multi');
      if (!parsed.ok) return makeInvalidResult(parsed.error);
      if (parsed.value < 1 || parsed.value > node.keys.length) {
        return makeInvalidResult(`multi() k out of range: ${node.k}`);
      }
      const keys = new Set<string>();
      let hasDuplicateKeys = false;
      node.keys.forEach(key => {
        if (keys.has(key)) hasDuplicateKeys = true;
        keys.add(key);
      });
      const correctnessResult = multiCorrectness();
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: multiMalleability(),
        timelockInfo: newTimelockInfo(),
        keys,
        hasDuplicateKeys
      });
    }
    case 'multi_a': {
      if (!context.tapscript)
        return makeInvalidResult('multi_a() is only valid in tapscript');
      const parsed = parseInteger(node.k, 'multi_a');
      if (!parsed.ok) return makeInvalidResult(parsed.error);
      if (parsed.value < 1 || parsed.value > node.keys.length) {
        return makeInvalidResult(`multi_a() k out of range: ${node.k}`);
      }
      const keys = new Set<string>();
      let hasDuplicateKeys = false;
      node.keys.forEach(key => {
        if (keys.has(key)) hasDuplicateKeys = true;
        keys.add(key);
      });
      const correctnessResult = multiACorrectness();
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: multiMalleability(),
        timelockInfo: newTimelockInfo(),
        keys,
        hasDuplicateKeys
      });
    }
    case 'a': {
      // altstack wrapper (a:)
      const child = analyzeNode(node.arg, context);
      if (!child.valid) return child;
      const correctnessResult = altCorrectness(child.correctness);
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: child.malleability,
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 's': {
      // swap wrapper (s:)
      const child = analyzeNode(node.arg, context);
      if (!child.valid) return child;
      const correctnessResult = swapCorrectness(child.correctness);
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: child.malleability,
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 'c': {
      // check wrapper (c:)
      const child = analyzeNode(node.arg, context);
      if (!child.valid) return child;
      const correctnessResult = checkCorrectness(child.correctness);
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: checkMalleability(child.malleability),
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 'd': {
      // dup-if wrapper (d:)
      const child = analyzeNode(node.arg, context);
      if (!child.valid) return child;
      const correctnessResult = context.tapscript
        ? dupIfTapscriptCorrectness(child.correctness)
        : dupIfWshCorrectness(child.correctness);
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: dupIfMalleability(child.malleability),
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 'v': {
      // verify wrapper (v:)
      const child = analyzeNode(node.arg, context);
      if (!child.valid) return child;
      const correctnessResult = verifyCorrectness(child.correctness);
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: verifyMalleability(child.malleability),
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 'j': {
      // nonzero wrapper (j:)
      const child = analyzeNode(node.arg, context);
      if (!child.valid) return child;
      const correctnessResult = nonZeroCorrectness(child.correctness);
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: nonZeroMalleability(child.malleability),
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 'n': {
      // zero-not-equal wrapper (n:)
      const child = analyzeNode(node.arg, context);
      if (!child.valid) return child;
      const correctnessResult = zeroNotEqualCorrectness(child.correctness);
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: child.malleability,
        timelockInfo: child.timelockInfo,
        keys: child.keys,
        hasDuplicateKeys: child.hasDuplicateKeys
      });
    }
    case 'and_v': {
      const left = analyzeNode(node.args[0], context);
      const right = analyzeNode(node.args[1], context);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const correctnessResult = andVCorrectness(
        left.correctness,
        right.correctness
      );
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      const keysResult = mergeKeySets(left, right);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: andVMalleability(left.malleability, right.malleability),
        timelockInfo: combineAndTimelocks(
          left.timelockInfo,
          right.timelockInfo
        ),
        keys: keysResult.keys,
        hasDuplicateKeys: keysResult.hasDuplicateKeys
      });
    }
    case 'and_b': {
      const left = analyzeNode(node.args[0], context);
      const right = analyzeNode(node.args[1], context);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const correctnessResult = andBCorrectness(
        left.correctness,
        right.correctness
      );
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      const keysResult = mergeKeySets(left, right);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: andBMalleability(left.malleability, right.malleability),
        timelockInfo: combineAndTimelocks(
          left.timelockInfo,
          right.timelockInfo
        ),
        keys: keysResult.keys,
        hasDuplicateKeys: keysResult.hasDuplicateKeys
      });
    }
    case 'or_b': {
      const left = analyzeNode(node.args[0], context);
      const right = analyzeNode(node.args[1], context);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const correctnessResult = orBCorrectness(
        left.correctness,
        right.correctness
      );
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      const keysResult = mergeKeySets(left, right);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: orBMalleability(left.malleability, right.malleability),
        timelockInfo: combineOrTimelocks(left.timelockInfo, right.timelockInfo),
        keys: keysResult.keys,
        hasDuplicateKeys: keysResult.hasDuplicateKeys
      });
    }
    case 'or_c': {
      const left = analyzeNode(node.args[0], context);
      const right = analyzeNode(node.args[1], context);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const correctnessResult = orCCorrectness(
        left.correctness,
        right.correctness
      );
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      const keysResult = mergeKeySets(left, right);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: orCMalleability(left.malleability, right.malleability),
        timelockInfo: combineOrTimelocks(left.timelockInfo, right.timelockInfo),
        keys: keysResult.keys,
        hasDuplicateKeys: keysResult.hasDuplicateKeys
      });
    }
    case 'or_d': {
      const left = analyzeNode(node.args[0], context);
      const right = analyzeNode(node.args[1], context);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const correctnessResult = orDCorrectness(
        left.correctness,
        right.correctness
      );
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      const keysResult = mergeKeySets(left, right);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: orDMalleability(left.malleability, right.malleability),
        timelockInfo: combineOrTimelocks(left.timelockInfo, right.timelockInfo),
        keys: keysResult.keys,
        hasDuplicateKeys: keysResult.hasDuplicateKeys
      });
    }
    case 'or_i': {
      const left = analyzeNode(node.args[0], context);
      const right = analyzeNode(node.args[1], context);
      if (!left.valid) return left;
      if (!right.valid) return right;
      const correctnessResult = orICorrectness(
        left.correctness,
        right.correctness
      );
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      const keysResult = mergeKeySets(left, right);
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: orIMalleability(left.malleability, right.malleability),
        timelockInfo: combineOrTimelocks(left.timelockInfo, right.timelockInfo),
        keys: keysResult.keys,
        hasDuplicateKeys: keysResult.hasDuplicateKeys
      });
    }
    case 'andor': {
      const left = analyzeNode(node.args[0], context);
      const mid = analyzeNode(node.args[1], context);
      const right = analyzeNode(node.args[2], context);
      if (!left.valid) return left;
      if (!mid.valid) return mid;
      if (!right.valid) return right;
      const correctnessResult = andOrCorrectness(
        left.correctness,
        mid.correctness,
        right.correctness
      );
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      const leftMidKeys = mergeKeySets(left, mid);
      const allKeys = mergeKeySets(leftMidKeys, right);
      const combinedTimelocks = combineOrTimelocks(
        combineAndTimelocks(left.timelockInfo, mid.timelockInfo),
        right.timelockInfo
      );
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: andOrMalleability(
          left.malleability,
          mid.malleability,
          right.malleability
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
      const subs = node.subs.map(sub => analyzeNode(sub, context));
      const invalidSub = subs.find(sub => !sub.valid);
      if (invalidSub) return invalidSub;
      const validSubs = subs as ValidAnalysisResult[];
      const correctnessResult = threshCorrectness(
        k,
        validSubs.map(sub => sub.correctness)
      );
      if (!correctnessResult.ok)
        return makeInvalidResult(correctnessResult.error);
      const timelocks = combineThresholdTimelocks(
        k,
        validSubs.map(sub => sub.timelockInfo)
      );
      const mergedKeys = validSubs.reduce<KeySetResult>(
        (acc, sub) => mergeKeySets(acc, sub),
        { keys: new Set<string>(), hasDuplicateKeys: false }
      );
      return makeValidResult({
        correctness: correctnessResult.correctness,
        malleability: thresholdMalleability(
          k,
          validSubs.map(sub => sub.malleability)
        ),
        timelockInfo: timelocks,
        keys: mergedKeys.keys,
        hasDuplicateKeys: mergedKeys.hasDuplicateKeys
      });
    }
    default: {
      const unknownNode = node as { type: string };
      return makeInvalidResult(`Unknown miniscript node: ${unknownNode.type}`);
    }
  }
};

/** Analyze a parsed AST node and compute issane flags. */
export const analyzeParsedNode = (
  /** Parsed miniscript node. */
  node: Node,
  /** Analysis options. */
  options: AnalyzeOptions = {}
): ParsedAnalysisResult => {
  const context: AnalyzeContext = { tapscript: Boolean(options.tapscript) };
  const analysis = analyzeNode(node, context);
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

  const needsSignature = analysis.malleability.signed;
  const nonMalleable = analysis.malleability.nonMalleable;
  const timelockMix = analysis.timelockInfo.contains_combination;
  const hasDuplicateKeys = analysis.hasDuplicateKeys;
  const issanesublevel =
    needsSignature && nonMalleable && !timelockMix && !hasDuplicateKeys;
  const issane = issanesublevel && analysis.correctness.basicType === 'B';
  let error: string | null = null;
  if (!needsSignature) error = 'SiglessBranch';
  else if (!nonMalleable) error = 'Malleable';
  else if (hasDuplicateKeys) error = 'RepeatedPubkeys';
  else if (timelockMix) error = 'HeightTimelockCombination';
  else if (analysis.correctness.basicType !== 'B') error = 'NonTopLevel';

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

/** Analyze a miniscript expression and return sanity flags. */
export const analyzeMiniscript = (
  /** Raw miniscript expression. */
  miniscript: string,
  /** Analysis options. */
  options: AnalyzeOptions = {}
): ParsedAnalysisResult => {
  const node = parseExpression(miniscript);
  return analyzeParsedNode(node, options);
};
