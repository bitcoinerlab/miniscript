// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

/**
 * Miniscript correctness helpers.
 * See ANALYZER.md "Correctness vs malleability" for details.
 */

/**
 * @typedef {Object} Correctness
 * @property {string} base
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

// Correctness helpers return { ok, corr, error? }.
// Leaf fragments are always ok and return their base correctness directly.
export const trueCorrectness = () =>
  ({
    ok: true,
    corr: {
      base: BasicType.B,
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
    corr: {
      base: BasicType.B,
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
    corr: {
      base: BasicType.K,
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
    corr: {
      base: BasicType.K,
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
    corr: {
      base: BasicType.B,
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
    corr: {
      base: BasicType.B,
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
    corr: {
      base: BasicType.B,
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
    corr: {
      base: BasicType.B,
      zeroArg: true,
      oneArg: false,
      nonZero: false,
      dissatisfiable: false,
      unit: false
    }
  });

/**
 * Apply the `a:` wrapper to a correctness type.
 * @param {Correctness} corr
 * @returns {{ok: boolean, corr?: Correctness, error?: string}}
 */
export const altCorrectness = corr => {
  if (corr.base !== BasicType.B) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    corr: {
      base: BasicType.W,
      zeroArg: corr.zeroArg,
      oneArg: corr.oneArg,
      nonZero: corr.nonZero,
      dissatisfiable: corr.dissatisfiable,
      unit: corr.unit
    }
  };
};

/**
 * Apply the `s:` wrapper to a correctness type.
 * @param {Correctness} corr
 * @returns {{ok: boolean, corr?: Correctness, error?: string}}
 */
export const swapCorrectness = corr => {
  if (corr.base !== BasicType.B) return { ok: false, error: 'ChildBase1' };
  if (!corr.oneArg) return { ok: false, error: 'SwapNonOne' };
  return {
    ok: true,
    corr: {
      base: BasicType.W,
      zeroArg: corr.zeroArg,
      oneArg: corr.oneArg,
      nonZero: corr.nonZero,
      dissatisfiable: corr.dissatisfiable,
      unit: corr.unit
    }
  };
};

/**
 * Apply the `c:` wrapper to a correctness type.
 * @param {Correctness} corr
 * @returns {{ok: boolean, corr?: Correctness, error?: string}}
 */
export const checkCorrectness = corr => {
  if (corr.base !== BasicType.K) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    corr: {
      base: BasicType.B,
      zeroArg: corr.zeroArg,
      oneArg: corr.oneArg,
      nonZero: corr.nonZero,
      dissatisfiable: corr.dissatisfiable,
      unit: true
    }
  };
};

export const dupIfWshCorrectness = corr => {
  if (corr.base !== BasicType.V) return { ok: false, error: 'ChildBase1' };
  if (!corr.zeroArg) return { ok: false, error: 'NonZeroDupIf' };
  return {
    ok: true,
    corr: {
      base: BasicType.B,
      zeroArg: false,
      oneArg: true,
      nonZero: true,
      dissatisfiable: true,
      unit: false
    }
  };
};

export const dupIfTapscriptCorrectness = corr => {
  if (corr.base !== BasicType.V) return { ok: false, error: 'ChildBase1' };
  if (!corr.zeroArg) return { ok: false, error: 'NonZeroDupIf' };
  return {
    ok: true,
    corr: {
      base: BasicType.B,
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
 * @param {Correctness} corr
 * @returns {{ok: boolean, corr?: Correctness, error?: string}}
 */
export const verifyCorrectness = corr => {
  if (corr.base !== BasicType.B) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    corr: {
      base: BasicType.V,
      zeroArg: corr.zeroArg,
      oneArg: corr.oneArg,
      nonZero: corr.nonZero,
      dissatisfiable: false,
      unit: false
    }
  };
};

/**
 * Apply the `j:` wrapper to a correctness type.
 * @param {Correctness} corr
 * @returns {{ok: boolean, corr?: Correctness, error?: string}}
 */
export const nonZeroCorrectness = corr => {
  if (!corr.nonZero) return { ok: false, error: 'NonZeroZero' };
  if (corr.base !== BasicType.B) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    corr: {
      base: BasicType.B,
      zeroArg: false,
      oneArg: corr.oneArg,
      nonZero: true,
      dissatisfiable: true,
      unit: corr.unit
    }
  };
};

/**
 * Apply the `n:` wrapper to a correctness type.
 * @param {Correctness} corr
 * @returns {{ok: boolean, corr?: Correctness, error?: string}}
 */
export const zeroNotEqualCorrectness = corr => {
  if (corr.base !== BasicType.B) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    corr: {
      base: BasicType.B,
      zeroArg: corr.zeroArg,
      oneArg: corr.oneArg,
      nonZero: corr.nonZero,
      dissatisfiable: corr.dissatisfiable,
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
  if (left.base !== BasicType.B || right.base !== BasicType.W) {
    return { ok: false, error: 'ChildBase2' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg =
    (left.zeroArg && right.oneArg) || (right.zeroArg && left.oneArg);
  const nonZero = left.nonZero || (left.zeroArg && right.nonZero);
  return {
    ok: true,
    corr: {
      base: BasicType.B,
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
    left.base !== BasicType.V ||
    ![BasicType.B, BasicType.K, BasicType.V].includes(right.base)
  ) {
    return { ok: false, error: 'ChildBase2' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg =
    (left.zeroArg && right.oneArg) || (right.zeroArg && left.oneArg);
  const nonZero = left.nonZero || (left.zeroArg && right.nonZero);
  return {
    ok: true,
    corr: {
      base: right.base,
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
  if (left.base !== BasicType.B || right.base !== BasicType.W) {
    return { ok: false, error: 'ChildBase2' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg =
    (left.zeroArg && right.oneArg) || (right.zeroArg && left.oneArg);
  return {
    ok: true,
    corr: {
      base: BasicType.B,
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
  if (left.base !== BasicType.B || right.base !== BasicType.B) {
    return { ok: false, error: 'ChildBase2' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg = left.oneArg && right.zeroArg;
  return {
    ok: true,
    corr: {
      base: BasicType.B,
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
  if (left.base !== BasicType.B || right.base !== BasicType.V) {
    return { ok: false, error: 'ChildBase2' };
  }
  const zeroArg = left.zeroArg && right.zeroArg;
  const oneArg = left.oneArg && right.zeroArg;
  return {
    ok: true,
    corr: {
      base: BasicType.V,
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
  const basePair = `${left.base}:${right.base}`;
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
    corr: {
      base: left.base,
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
  const baseTriplet = `${left.base}:${mid.base}:${right.base}`;
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
    corr: {
      base: mid.base,
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
    if (i === 0 && subtype.base !== BasicType.B) {
      return { ok: false, error: 'ThresholdBase' };
    }
    if (i !== 0 && subtype.base !== BasicType.W) {
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
    corr: {
      base: BasicType.B,
      zeroArg,
      oneArg,
      nonZero: false,
      dissatisfiable: true,
      unit: true
    }
  };
};
