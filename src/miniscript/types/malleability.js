// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

/**
 * Miniscript malleability helpers.
 * See ANALYZER.md "Guaranteeing non-malleability" for details.
 */

/**
 * @typedef {Object} Malleability
 * @property {boolean} signed
 * @property {boolean} forced
 * @property {boolean} expressive
 * @property {boolean} nonMalleable
 */

const allNonMalleable = malleabilities =>
  malleabilities.every(malleability => malleability.nonMalleable);
const allExpressive = malleabilities =>
  malleabilities.every(malleability => malleability.expressive);
const countUnsigned = malleabilities =>
  malleabilities.reduce((acc, malleability) => acc + Number(!malleability.signed), 0);

export const trueMalleability = {
  signed: false,
  forced: true,
  expressive: false,
  nonMalleable: true
};

export const falseMalleability = {
  signed: true,
  forced: false,
  expressive: true,
  nonMalleable: true
};

// Malleability helpers return signed/forced/expressive plus nonMalleable.
export const pkMalleability = () => ({
  signed: true,
  forced: false,
  expressive: true,
  nonMalleable: true
});

export const multiMalleability = () => ({
  signed: true,
  forced: false,
  expressive: true,
  nonMalleable: true
});

export const hashMalleability = () => ({
  signed: false,
  forced: false,
  expressive: false,
  nonMalleable: true
});

export const timeMalleability = () => ({
  signed: false,
  forced: true,
  expressive: false,
  nonMalleable: true
});

/**
 * Malleability rules for the `c:` wrapper.
 * @param {Malleability} malleability
 * @returns {Malleability}
 */
export const checkMalleability = malleability => ({
  signed: true,
  forced: malleability.forced,
  expressive: malleability.expressive,
  nonMalleable: malleability.nonMalleable
});

/**
 * Malleability rules for the `d:` wrapper.
 * @param {Malleability} malleability
 * @returns {Malleability}
 */
export const dupIfMalleability = malleability => ({
  signed: malleability.signed,
  forced: false,
  expressive: true,
  nonMalleable: malleability.nonMalleable
});

/**
 * Malleability rules for the `j:` wrapper.
 * @param {Malleability} malleability
 * @returns {Malleability}
 */
export const nonZeroMalleability = malleability => ({
  signed: malleability.signed,
  forced: false,
  expressive: malleability.forced,
  nonMalleable: malleability.nonMalleable
});

/**
 * Malleability rules for the `v:` wrapper.
 * @param {Malleability} malleability
 * @returns {Malleability}
 */
export const verifyMalleability = malleability => ({
  signed: malleability.signed,
  forced: true,
  expressive: false,
  nonMalleable: malleability.nonMalleable
});

/**
 * Malleability rules for and_b(X,Y).
 * @param {Malleability} left
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const andBMalleability = (left, right) => ({
  signed: left.signed || right.signed,
  forced:
    (left.forced && right.forced) ||
    (left.signed && left.forced) ||
    (right.signed && right.forced),
  expressive:
    left.expressive && right.expressive && left.signed && right.signed,
  nonMalleable: left.nonMalleable && right.nonMalleable
});

/**
 * Malleability rules for and_v(X,Y).
 * @param {Malleability} left
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const andVMalleability = (left, right) => ({
  signed: left.signed || right.signed,
  forced: left.signed || right.forced,
  expressive: false,
  nonMalleable: left.nonMalleable && right.nonMalleable
});

/**
 * Malleability rules for or_b(X,Y).
 * @param {Malleability} left
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const orBMalleability = (left, right) => ({
  signed: left.signed && right.signed,
  forced: false,
  expressive: true,
  nonMalleable:
    left.nonMalleable &&
    right.nonMalleable &&
    left.expressive &&
    right.expressive &&
    (left.signed || right.signed)
});

/**
 * Malleability rules for or_d(X,Y).
 * @param {Malleability} left
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const orDMalleability = (left, right) => ({
  signed: left.signed && right.signed,
  forced: right.forced,
  expressive: right.expressive,
  nonMalleable:
    left.nonMalleable &&
    right.nonMalleable &&
    left.expressive &&
    (left.signed || right.signed)
});

/**
 * Malleability rules for or_c(X,Y).
 * @param {Malleability} left
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const orCMalleability = (left, right) => ({
  signed: left.signed && right.signed,
  forced: true,
  expressive: false,
  nonMalleable:
    left.nonMalleable &&
    right.nonMalleable &&
    left.expressive &&
    (left.signed || right.signed)
});

/**
 * Malleability rules for or_i(X,Y).
 * @param {Malleability} left
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const orIMalleability = (left, right) => ({
  signed: left.signed && right.signed,
  forced: left.forced && right.forced,
  expressive:
    (left.expressive && right.forced) ||
    (right.expressive && left.forced),
  nonMalleable:
    left.nonMalleable &&
    right.nonMalleable &&
    (left.signed || right.signed)
});

/**
 * Malleability rules for andor(X,Y,Z).
 * @param {Malleability} left
 * @param {Malleability} mid
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const andOrMalleability = (left, mid, right) => ({
  signed: right.signed && (left.signed || mid.signed),
  forced: right.forced && (left.signed || mid.forced),
  expressive: right.expressive && (left.signed || mid.forced),
  nonMalleable:
    left.nonMalleable &&
    mid.nonMalleable &&
    right.nonMalleable &&
    left.expressive &&
    (left.signed || mid.signed || right.signed)
});

/**
 * Malleability rules for thresh(k, subs...).
 * @param {number} k
 * @param {Malleability[]} subs
 * @returns {Malleability}
 */
export const thresholdMalleability = (k, subs) => {
  const nonSignedCount = countUnsigned(subs);
  const signed = nonSignedCount <= k - 1;
  const expressive = subs.every(sub => sub.signed);
  return {
    signed,
    forced: false,
    expressive,
    nonMalleable:
      allNonMalleable(subs) &&
      allExpressive(subs) &&
      nonSignedCount <= k
  };
};
