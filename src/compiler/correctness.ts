// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

/**
 * Miniscript correctness helpers.
 * See COMPILER.md "Correctness vs malleability" for details.
 */

/** Basic miniscript output categories. */
export type BasicType = 'B' | 'K' | 'V' | 'W';

/** Correctness flags for a miniscript fragment. */
export type Correctness = {
  basicType: BasicType;
  zeroArg: boolean;
  oneArg: boolean;
  nonZero: boolean;
  dissatisfiable: boolean;
  unit: boolean;
};

/** Discriminated result of a correctness check. */
export type CorrectnessResult =
  | { ok: true; correctness: Correctness }
  | { ok: false; error: string };

// Correctness helpers return CorrectnessResult.
// Leaf fragments are always ok and return their basic type directly.
export const trueCorrectness = (): CorrectnessResult => ({
  ok: true,
  correctness: {
    basicType: 'B',
    zeroArg: true,
    oneArg: false,
    nonZero: false,
    dissatisfiable: false,
    unit: true
  }
});

export const falseCorrectness = (): CorrectnessResult => ({
  ok: true,
  correctness: {
    basicType: 'B',
    zeroArg: true,
    oneArg: false,
    nonZero: false,
    dissatisfiable: true,
    unit: true
  }
});

export const pkKCorrectness = (): CorrectnessResult => ({
  ok: true,
  correctness: {
    basicType: 'K',
    zeroArg: false,
    oneArg: true,
    nonZero: true,
    dissatisfiable: true,
    unit: true
  }
});

export const pkHCorrectness = (): CorrectnessResult => ({
  ok: true,
  correctness: {
    basicType: 'K',
    zeroArg: false,
    oneArg: false,
    nonZero: true,
    dissatisfiable: true,
    unit: true
  }
});

export const multiCorrectness = (): CorrectnessResult => ({
  ok: true,
  correctness: {
    basicType: 'B',
    zeroArg: false,
    oneArg: false,
    nonZero: true,
    dissatisfiable: true,
    unit: true
  }
});

export const multiACorrectness = (): CorrectnessResult => ({
  ok: true,
  correctness: {
    basicType: 'B',
    zeroArg: false,
    oneArg: false,
    nonZero: false,
    dissatisfiable: true,
    unit: true
  }
});

export const hashCorrectness = (): CorrectnessResult => ({
  ok: true,
  correctness: {
    basicType: 'B',
    zeroArg: false,
    oneArg: true,
    nonZero: true,
    dissatisfiable: true,
    unit: true
  }
});

export const timeCorrectness = (): CorrectnessResult => ({
  ok: true,
  correctness: {
    basicType: 'B',
    zeroArg: true,
    oneArg: false,
    nonZero: false,
    dissatisfiable: false,
    unit: false
  }
});

/** Apply the `a:` wrapper to a correctness type. */
export const altCorrectness = (
  /** Child correctness to wrap. */
  correctness: Correctness
): CorrectnessResult => {
  if (correctness.basicType !== 'B') {
    return { ok: false, error: 'a: requires a B child.' };
  }
  return {
    ok: true,
    correctness: {
      basicType: 'W',
      zeroArg: correctness.zeroArg,
      oneArg: correctness.oneArg,
      nonZero: correctness.nonZero,
      dissatisfiable: correctness.dissatisfiable,
      unit: correctness.unit
    }
  };
};

/** Apply the `s:` wrapper to a correctness type. */
export const swapCorrectness = (
  /** Child correctness to wrap. */
  correctness: Correctness
): CorrectnessResult => {
  if (correctness.basicType !== 'B') {
    return { ok: false, error: 's: requires a B child.' };
  }
  if (!correctness.oneArg) {
    return { ok: false, error: 's: requires a one-arg child.' };
  }
  return {
    ok: true,
    correctness: {
      basicType: 'W',
      zeroArg: correctness.zeroArg,
      oneArg: correctness.oneArg,
      nonZero: correctness.nonZero,
      dissatisfiable: correctness.dissatisfiable,
      unit: correctness.unit
    }
  };
};

/** Apply the `c:` wrapper to a correctness type. */
export const checkCorrectness = (
  /** Child correctness to wrap. */
  correctness: Correctness
): CorrectnessResult => {
  if (correctness.basicType !== 'K') {
    return { ok: false, error: 'c: requires a K child.' };
  }
  return {
    ok: true,
    correctness: {
      basicType: 'B',
      zeroArg: correctness.zeroArg,
      oneArg: correctness.oneArg,
      nonZero: correctness.nonZero,
      dissatisfiable: correctness.dissatisfiable,
      unit: true
    }
  };
};

/** Apply the `d:` wrapper to a correctness type for Segwit v0. */
export const dupIfWshCorrectness = (
  /** Child correctness to wrap. */
  correctness: Correctness
): CorrectnessResult => {
  if (correctness.basicType !== 'V') {
    return { ok: false, error: 'd: requires a V child.' };
  }
  if (!correctness.zeroArg) {
    return { ok: false, error: 'd: requires a zero-arg child.' };
  }
  return {
    ok: true,
    correctness: {
      basicType: 'B',
      zeroArg: false,
      oneArg: true,
      nonZero: true,
      dissatisfiable: true,
      unit: false
    }
  };
};

/** Apply the `d:` wrapper to a correctness type for tapscript. */
export const dupIfTapscriptCorrectness = (
  /** Child correctness to wrap. */
  correctness: Correctness
): CorrectnessResult => {
  if (correctness.basicType !== 'V') {
    return { ok: false, error: 'd: requires a V child.' };
  }
  if (!correctness.zeroArg) {
    return { ok: false, error: 'd: requires a zero-arg child.' };
  }
  return {
    ok: true,
    correctness: {
      basicType: 'B',
      zeroArg: false,
      oneArg: true,
      nonZero: true,
      dissatisfiable: true,
      unit: true
    }
  };
};

/** Apply the `v:` wrapper to a correctness type. */
export const verifyCorrectness = (
  /** Child correctness to wrap. */
  correctness: Correctness
): CorrectnessResult => {
  if (correctness.basicType !== 'B') {
    return { ok: false, error: 'v: requires a B child.' };
  }
  return {
    ok: true,
    correctness: {
      basicType: 'V',
      zeroArg: correctness.zeroArg,
      oneArg: correctness.oneArg,
      nonZero: correctness.nonZero,
      dissatisfiable: false,
      unit: false
    }
  };
};

/** Apply the `j:` wrapper to a correctness type. */
export const nonZeroCorrectness = (
  /** Child correctness to wrap. */
  correctness: Correctness
): CorrectnessResult => {
  if (!correctness.nonZero) {
    return { ok: false, error: 'j: requires a nonzero child.' };
  }
  if (correctness.basicType !== 'B') {
    return { ok: false, error: 'j: requires a B child.' };
  }
  return {
    ok: true,
    correctness: {
      basicType: 'B',
      zeroArg: false,
      oneArg: correctness.oneArg,
      nonZero: true,
      dissatisfiable: true,
      unit: correctness.unit
    }
  };
};

/** Apply the `n:` wrapper to a correctness type. */
export const zeroNotEqualCorrectness = (
  /** Child correctness to wrap. */
  correctness: Correctness
): CorrectnessResult => {
  if (correctness.basicType !== 'B') {
    return { ok: false, error: 'n: requires a B child.' };
  }
  return {
    ok: true,
    correctness: {
      basicType: 'B',
      zeroArg: correctness.zeroArg,
      oneArg: correctness.oneArg,
      nonZero: correctness.nonZero,
      dissatisfiable: correctness.dissatisfiable,
      unit: true
    }
  };
};

/** Correctness rules for and_b(X,Y). */
export const andBCorrectness = (
  /** Left child correctness. */
  left: Correctness,
  /** Right child correctness. */
  right: Correctness
): CorrectnessResult => {
  if (left.basicType !== 'B' || right.basicType !== 'W') {
    return { ok: false, error: 'and_b: requires (B,W) children.' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg =
    (left.zeroArg && right.oneArg) || (right.zeroArg && left.oneArg);
  const nonZero = left.nonZero || (left.zeroArg && right.nonZero);
  return {
    ok: true,
    correctness: {
      basicType: 'B',
      zeroArg,
      oneArg,
      nonZero,
      dissatisfiable: left.dissatisfiable && right.dissatisfiable,
      unit: true
    }
  };
};

/** Correctness rules for and_v(X,Y). */
export const andVCorrectness = (
  /** Left child correctness. */
  left: Correctness,
  /** Right child correctness. */
  right: Correctness
): CorrectnessResult => {
  if (left.basicType !== 'V' || !['B', 'K', 'V'].includes(right.basicType)) {
    return { ok: false, error: 'and_v: requires (V,B|K|V) children.' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg =
    (left.zeroArg && right.oneArg) || (right.zeroArg && left.oneArg);
  const nonZero = left.nonZero || (left.zeroArg && right.nonZero);
  return {
    ok: true,
    correctness: {
      basicType: right.basicType,
      zeroArg,
      oneArg,
      nonZero,
      dissatisfiable: false,
      unit: right.unit
    }
  };
};

/** Correctness rules for or_b(X,Y). */
export const orBCorrectness = (
  /** Left child correctness. */
  left: Correctness,
  /** Right child correctness. */
  right: Correctness
): CorrectnessResult => {
  if (!left.dissatisfiable) {
    return { ok: false, error: 'or_b: left child must be dissatisfiable.' };
  }
  if (!right.dissatisfiable) {
    return { ok: false, error: 'or_b: right child must be dissatisfiable.' };
  }
  if (left.basicType !== 'B' || right.basicType !== 'W') {
    return { ok: false, error: 'or_b: requires (B,W) children.' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg =
    (left.zeroArg && right.oneArg) || (right.zeroArg && left.oneArg);
  return {
    ok: true,
    correctness: {
      basicType: 'B',
      zeroArg,
      oneArg,
      nonZero: false,
      dissatisfiable: true,
      unit: true
    }
  };
};

/** Correctness rules for or_d(X,Y). */
export const orDCorrectness = (
  /** Left child correctness. */
  left: Correctness,
  /** Right child correctness. */
  right: Correctness
): CorrectnessResult => {
  if (!left.dissatisfiable) {
    return { ok: false, error: 'or_d: left child must be dissatisfiable.' };
  }
  if (!left.unit) {
    return { ok: false, error: 'or_d: left child must be unit.' };
  }
  if (left.basicType !== 'B' || right.basicType !== 'B') {
    return { ok: false, error: 'or_d: requires (B,B) children.' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg = left.oneArg && right.zeroArg;
  return {
    ok: true,
    correctness: {
      basicType: 'B',
      zeroArg,
      oneArg,
      nonZero: false,
      dissatisfiable: right.dissatisfiable,
      unit: right.unit
    }
  };
};

/** Correctness rules for or_c(X,Y). */
export const orCCorrectness = (
  /** Left child correctness. */
  left: Correctness,
  /** Right child correctness. */
  right: Correctness
): CorrectnessResult => {
  if (!left.dissatisfiable) {
    return { ok: false, error: 'or_c: left child must be dissatisfiable.' };
  }
  if (!left.unit) {
    return { ok: false, error: 'or_c: left child must be unit.' };
  }
  if (left.basicType !== 'B' || right.basicType !== 'V') {
    return { ok: false, error: 'or_c: requires (B,V) children.' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg = left.oneArg && right.zeroArg;
  return {
    ok: true,
    correctness: {
      basicType: 'V',
      zeroArg,
      oneArg,
      nonZero: false,
      dissatisfiable: false,
      unit: false
    }
  };
};

/** Correctness rules for or_i(X,Y). */
export const orICorrectness = (
  /** Left child correctness. */
  left: Correctness,
  /** Right child correctness. */
  right: Correctness
): CorrectnessResult => {
  const basePair = `${left.basicType}:${right.basicType}`;
  if (!['B:B', 'V:V', 'K:K'].includes(basePair)) {
    return {
      ok: false,
      error: 'or_i: child base types must match (B,B), (V,V), or (K,K).'
    };
  }
  return {
    ok: true,
    correctness: {
      basicType: left.basicType,
      zeroArg: false,
      oneArg: left.zeroArg && right.zeroArg,
      nonZero: false,
      dissatisfiable: left.dissatisfiable || right.dissatisfiable,
      unit: left.unit && right.unit
    }
  };
};

/** Correctness rules for andor(X,Y,Z). */
export const andOrCorrectness = (
  /** Left child correctness. */
  left: Correctness,
  /** Middle child correctness. */
  mid: Correctness,
  /** Right child correctness. */
  right: Correctness
): CorrectnessResult => {
  if (!left.dissatisfiable) {
    return { ok: false, error: 'andor: left child must be dissatisfiable.' };
  }
  if (!left.unit) {
    return { ok: false, error: 'andor: left child must be unit.' };
  }
  const baseTriplet = `${left.basicType}:${mid.basicType}:${right.basicType}`;
  if (!['B:B:B', 'B:K:K', 'B:V:V'].includes(baseTriplet)) {
    return {
      ok: false,
      error: 'andor: child base types must be (B,B,B), (B,K,K), or (B,V,V).'
    };
  }
  const zeroArg = left.zeroArg && mid.zeroArg && right.zeroArg;
  const oneArg =
    (left.zeroArg && mid.oneArg && right.oneArg) ||
    (left.oneArg && mid.zeroArg && right.zeroArg);
  return {
    ok: true,
    correctness: {
      basicType: mid.basicType,
      zeroArg,
      oneArg,
      nonZero: false,
      dissatisfiable: right.dissatisfiable,
      unit: mid.unit && right.unit
    }
  };
};

/** Correctness rules for thresh(k, subs...). */
export const threshCorrectness = (
  /** Threshold to satisfy. */
  k: number,
  /** Child correctness list. */
  subs: Correctness[]
): CorrectnessResult => {
  void k;
  for (let i = 0; i < subs.length; i++) {
    const subtype = subs[i];
    if (!subtype) {
      return { ok: false, error: 'thresh: missing child.' };
    }
    if (i === 0 && subtype.basicType !== 'B') {
      return { ok: false, error: 'thresh: first child must be B.' };
    }
    if (i !== 0 && subtype.basicType !== 'W') {
      return { ok: false, error: 'thresh: non-first children must be W.' };
    }
    if (!subtype.unit) {
      return { ok: false, error: 'thresh: all children must be unit.' };
    }
    if (!subtype.dissatisfiable) {
      return {
        ok: false,
        error: 'thresh: all children must be dissatisfiable.'
      };
    }
  }
  const zeroArg = subs.every(sub => sub.zeroArg);
  const oneArg =
    subs.filter(sub => sub.oneArg).length === 1 &&
    subs.every(sub => sub.zeroArg || sub.oneArg);
  return {
    ok: true,
    correctness: {
      basicType: 'B',
      zeroArg,
      oneArg,
      nonZero: false,
      dissatisfiable: true,
      unit: true
    }
  };
};
