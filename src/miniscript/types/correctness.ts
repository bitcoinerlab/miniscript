// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

/**
 * Miniscript correctness helpers.
 * See ANALYZER.md "Correctness vs malleability" for details.
 */

/**
 * @typedef {Object} Correctness
 * @property {string} basicType
 * @property {boolean} zeroArg
 * @property {boolean} oneArg
 * @property {boolean} nonZero
 * @property {boolean} dissatisfiable
 * @property {boolean} unit
 */

export const BasicType = {
  B: 'B',
  K: 'K',
  V: 'V',
  W: 'W'
};

// Correctness helpers return { ok, correctness, error? }.
// Leaf fragments are always ok and return their basic type directly.
export const trueCorrectness = () =>
  ({
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg: true,
      oneArg: false,
      nonZero: false,
      dissatisfiable: false,
      unit: true
    }
  });

export const falseCorrectness = () =>
  ({
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg: true,
      oneArg: false,
      nonZero: false,
      dissatisfiable: true,
      unit: true
    }
  });

export const pkKCorrectness = () =>
  ({
    ok: true,
    correctness: {
      basicType: BasicType.K,
      zeroArg: false,
      oneArg: true,
      nonZero: true,
      dissatisfiable: true,
      unit: true
    }
  });

export const pkHCorrectness = () =>
  ({
    ok: true,
    correctness: {
      basicType: BasicType.K,
      zeroArg: false,
      oneArg: false,
      nonZero: true,
      dissatisfiable: true,
      unit: true
    }
  });

export const multiCorrectness = () =>
  ({
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg: false,
      oneArg: false,
      nonZero: true,
      dissatisfiable: true,
      unit: true
    }
  });

export const multiACorrectness = () =>
  ({
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg: false,
      oneArg: false,
      nonZero: false,
      dissatisfiable: true,
      unit: true
    }
  });

export const hashCorrectness = () =>
  ({
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg: false,
      oneArg: true,
      nonZero: true,
      dissatisfiable: true,
      unit: true
    }
  });

export const timeCorrectness = () =>
  ({
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg: true,
      oneArg: false,
      nonZero: false,
      dissatisfiable: false,
      unit: false
    }
  });

/**
 * Apply the `a:` wrapper to a correctness type.
 * @param {Correctness} correctness
 * @returns {{ok: boolean, correctness?: Correctness, error?: string}}
 */
export const altCorrectness = correctness => {
  if (correctness.basicType !== BasicType.B) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    correctness: {
      basicType: BasicType.W,
      zeroArg: correctness.zeroArg,
      oneArg: correctness.oneArg,
      nonZero: correctness.nonZero,
      dissatisfiable: correctness.dissatisfiable,
      unit: correctness.unit
    }
  };
};

/**
 * Apply the `s:` wrapper to a correctness type.
 * @param {Correctness} correctness
 * @returns {{ok: boolean, correctness?: Correctness, error?: string}}
 */
export const swapCorrectness = correctness => {
  if (correctness.basicType !== BasicType.B) return { ok: false, error: 'ChildBase1' };
  if (!correctness.oneArg) return { ok: false, error: 'SwapNonOne' };
  return {
    ok: true,
    correctness: {
      basicType: BasicType.W,
      zeroArg: correctness.zeroArg,
      oneArg: correctness.oneArg,
      nonZero: correctness.nonZero,
      dissatisfiable: correctness.dissatisfiable,
      unit: correctness.unit
    }
  };
};

/**
 * Apply the `c:` wrapper to a correctness type.
 * @param {Correctness} correctness
 * @returns {{ok: boolean, correctness?: Correctness, error?: string}}
 */
export const checkCorrectness = correctness => {
  if (correctness.basicType !== BasicType.K) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg: correctness.zeroArg,
      oneArg: correctness.oneArg,
      nonZero: correctness.nonZero,
      dissatisfiable: correctness.dissatisfiable,
      unit: true
    }
  };
};

export const dupIfWshCorrectness = correctness => {
  if (correctness.basicType !== BasicType.V) return { ok: false, error: 'ChildBase1' };
  if (!correctness.zeroArg) return { ok: false, error: 'NonZeroDupIf' };
  return {
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg: false,
      oneArg: true,
      nonZero: true,
      dissatisfiable: true,
      unit: false
    }
  };
};

export const dupIfTapscriptCorrectness = correctness => {
  if (correctness.basicType !== BasicType.V) return { ok: false, error: 'ChildBase1' };
  if (!correctness.zeroArg) return { ok: false, error: 'NonZeroDupIf' };
  return {
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg: false,
      oneArg: true,
      nonZero: true,
      dissatisfiable: true,
      unit: true
    }
  };
};

/**
 * Apply the `v:` wrapper to a correctness type.
 * @param {Correctness} correctness
 * @returns {{ok: boolean, correctness?: Correctness, error?: string}}
 */
export const verifyCorrectness = correctness => {
  if (correctness.basicType !== BasicType.B) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    correctness: {
      basicType: BasicType.V,
      zeroArg: correctness.zeroArg,
      oneArg: correctness.oneArg,
      nonZero: correctness.nonZero,
      dissatisfiable: false,
      unit: false
    }
  };
};

/**
 * Apply the `j:` wrapper to a correctness type.
 * @param {Correctness} correctness
 * @returns {{ok: boolean, correctness?: Correctness, error?: string}}
 */
export const nonZeroCorrectness = correctness => {
  if (!correctness.nonZero) return { ok: false, error: 'NonZeroZero' };
  if (correctness.basicType !== BasicType.B) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg: false,
      oneArg: correctness.oneArg,
      nonZero: true,
      dissatisfiable: true,
      unit: correctness.unit
    }
  };
};

/**
 * Apply the `n:` wrapper to a correctness type.
 * @param {Correctness} correctness
 * @returns {{ok: boolean, correctness?: Correctness, error?: string}}
 */
export const zeroNotEqualCorrectness = correctness => {
  if (correctness.basicType !== BasicType.B) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg: correctness.zeroArg,
      oneArg: correctness.oneArg,
      nonZero: correctness.nonZero,
      dissatisfiable: correctness.dissatisfiable,
      unit: true
    }
  };
};

/**
 * Correctness rules for and_b(X,Y).
 * @param {Correctness} left
 * @param {Correctness} right
 */
export const andBCorrectness = (left, right) => {
  if (left.basicType !== BasicType.B || right.basicType !== BasicType.W) {
    return { ok: false, error: 'ChildBase2' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg =
    (left.zeroArg && right.oneArg) || (right.zeroArg && left.oneArg);
  const nonZero = left.nonZero || (left.zeroArg && right.nonZero);
  return {
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg,
      oneArg,
      nonZero,
      dissatisfiable: left.dissatisfiable && right.dissatisfiable,
      unit: true
    }
  };
};

/**
 * Correctness rules for and_v(X,Y).
 * @param {Correctness} left
 * @param {Correctness} right
 */
export const andVCorrectness = (left, right) => {
  if (
    left.basicType !== BasicType.V ||
    ![BasicType.B, BasicType.K, BasicType.V].includes(right.basicType)
  ) {
    return { ok: false, error: 'ChildBase2' };
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

/**
 * Correctness rules for or_b(X,Y).
 * @param {Correctness} left
 * @param {Correctness} right
 */
export const orBCorrectness = (left, right) => {
  if (!left.dissatisfiable) return { ok: false, error: 'LeftNotDissatisfiable' };
  if (!right.dissatisfiable) return { ok: false, error: 'RightNotDissatisfiable' };
  if (left.basicType !== BasicType.B || right.basicType !== BasicType.W) {
    return { ok: false, error: 'ChildBase2' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg =
    (left.zeroArg && right.oneArg) || (right.zeroArg && left.oneArg);
  return {
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg,
      oneArg,
      nonZero: false,
      dissatisfiable: true,
      unit: true
    }
  };
};

/**
 * Correctness rules for or_d(X,Y).
 * @param {Correctness} left
 * @param {Correctness} right
 */
export const orDCorrectness = (left, right) => {
  if (!left.dissatisfiable) return { ok: false, error: 'LeftNotDissatisfiable' };
  if (!left.unit) return { ok: false, error: 'LeftNotUnit' };
  if (left.basicType !== BasicType.B || right.basicType !== BasicType.B) {
    return { ok: false, error: 'ChildBase2' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg = left.oneArg && right.zeroArg;
  return {
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg,
      oneArg,
      nonZero: false,
      dissatisfiable: right.dissatisfiable,
      unit: right.unit
    }
  };
};

/**
 * Correctness rules for or_c(X,Y).
 * @param {Correctness} left
 * @param {Correctness} right
 */
export const orCCorrectness = (left, right) => {
  if (!left.dissatisfiable) return { ok: false, error: 'LeftNotDissatisfiable' };
  if (!left.unit) return { ok: false, error: 'LeftNotUnit' };
  if (left.basicType !== BasicType.B || right.basicType !== BasicType.V) {
    return { ok: false, error: 'ChildBase2' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg = left.oneArg && right.zeroArg;
  return {
    ok: true,
    correctness: {
      basicType: BasicType.V,
      zeroArg,
      oneArg,
      nonZero: false,
      dissatisfiable: false,
      unit: false
    }
  };
};

/**
 * Correctness rules for or_i(X,Y).
 * @param {Correctness} left
 * @param {Correctness} right
 */
export const orICorrectness = (left, right) => {
  const basePair = `${left.basicType}:${right.basicType}`;
  if (
    ![
      `${BasicType.B}:${BasicType.B}`,
      `${BasicType.V}:${BasicType.V}`,
      `${BasicType.K}:${BasicType.K}`
    ].includes(basePair)
  ) {
    return { ok: false, error: 'ChildBase2' };
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

/**
 * Correctness rules for andor(X,Y,Z).
 * @param {Correctness} left
 * @param {Correctness} mid
 * @param {Correctness} right
 */
export const andOrCorrectness = (left, mid, right) => {
  if (!left.dissatisfiable) return { ok: false, error: 'LeftNotDissatisfiable' };
  if (!left.unit) return { ok: false, error: 'LeftNotUnit' };
  const baseTriplet = `${left.basicType}:${mid.basicType}:${right.basicType}`;
  if (
    ![
      `${BasicType.B}:${BasicType.B}:${BasicType.B}`,
      `${BasicType.B}:${BasicType.K}:${BasicType.K}`,
      `${BasicType.B}:${BasicType.V}:${BasicType.V}`
    ].includes(baseTriplet)
  ) {
    return { ok: false, error: 'ChildBase3' };
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

/**
 * Correctness rules for thresh(k, subs...).
 * @param {number} k
 * @param {Correctness[]} subs
 */
export const threshCorrectness = (k, subs) => {
  for (let i = 0; i < subs.length; i++) {
    const subtype = subs[i];
    if (i === 0 && subtype.basicType !== BasicType.B) {
      return { ok: false, error: 'ThresholdBase' };
    }
    if (i !== 0 && subtype.basicType !== BasicType.W) {
      return { ok: false, error: 'ThresholdBase' };
    }
    if (!subtype.unit) {
      return { ok: false, error: 'ThresholdNonUnit' };
    }
    if (!subtype.dissatisfiable) {
      return { ok: false, error: 'ThresholdDissat' };
    }
  }
  const zeroArg = subs.every(sub => sub.zeroArg);
  const oneArg =
    subs.filter(sub => sub.oneArg).length === 1 &&
    subs.every(sub => sub.zeroArg || sub.oneArg);
  return {
    ok: true,
    correctness: {
      basicType: BasicType.B,
      zeroArg,
      oneArg,
      nonZero: false,
      dissatisfiable: true,
      unit: true
    }
  };
};
