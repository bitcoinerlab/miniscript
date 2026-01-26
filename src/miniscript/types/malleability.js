// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

/**
 * Miniscript malleability helpers.
 * See ANALYZER.md "Correctness vs malleability" for details.
 */

/**
 * @typedef {Object} Malleability
 * @property {string} dissat
 * @property {boolean} safe
 * @property {boolean} nonMalleable
 */

export const Dissat = {
  None: 'None',
  Unique: 'Unique',
  Unknown: 'Unknown'
};

const dissatIs = (dissat, value) => dissat === value;

export const trueMalleability = {
  dissat: Dissat.None,
  safe: false,
  nonMalleable: true
};

export const falseMalleability = {
  dissat: Dissat.Unique,
  safe: true,
  nonMalleable: true
};

// Malleability helpers return Dissat/safe/nonMalleable for a fragment.
export const pkMalleability = () => ({
  dissat: Dissat.Unique,
  safe: true,
  nonMalleable: true
});

export const multiMalleability = () => ({
  dissat: Dissat.Unique,
  safe: true,
  nonMalleable: true
});

export const hashMalleability = () => ({
  dissat: Dissat.Unknown,
  safe: false,
  nonMalleable: true
});

export const timeMalleability = () => ({
  dissat: Dissat.None,
  safe: false,
  nonMalleable: true
});

/**
 * Malleability rules for the `d:` and `j:` wrappers.
 * @param {Malleability} mall
 * @returns {Malleability}
 */
export const dupIfMalleability = mall => ({
  dissat: dissatIs(mall.dissat, Dissat.None) ? Dissat.Unique : Dissat.Unknown,
  safe: mall.safe,
  nonMalleable: mall.nonMalleable
});

/**
 * Malleability rules for the `v:` wrapper.
 * @param {Malleability} mall
 * @returns {Malleability}
 */
export const verifyMalleability = mall => ({
  dissat: Dissat.None,
  safe: mall.safe,
  nonMalleable: mall.nonMalleable
});

/**
 * Malleability rules for and_b(X,Y).
 * @param {Malleability} left
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const andBMalleability = (left, right) => {
  let dissat;
  if (dissatIs(left.dissat, Dissat.None) && dissatIs(right.dissat, Dissat.None)) {
    dissat = Dissat.None;
  } else if (dissatIs(left.dissat, Dissat.None) && left.safe) {
    dissat = Dissat.None;
  } else if (dissatIs(right.dissat, Dissat.None) && right.safe) {
    dissat = Dissat.None;
  } else if (
    dissatIs(left.dissat, Dissat.Unique) &&
    dissatIs(right.dissat, Dissat.Unique)
  ) {
    dissat = left.safe && right.safe ? Dissat.Unique : Dissat.Unknown;
  } else {
    dissat = Dissat.Unknown;
  }
  return {
    dissat,
    safe: left.safe || right.safe,
    nonMalleable: left.nonMalleable && right.nonMalleable
  };
};

/**
 * Malleability rules for and_v(X,Y).
 * @param {Malleability} left
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const andVMalleability = (left, right) => ({
  dissat: dissatIs(right.dissat, Dissat.None) || left.safe ? Dissat.None : Dissat.Unknown,
  safe: left.safe || right.safe,
  nonMalleable: left.nonMalleable && right.nonMalleable
});

/**
 * Malleability rules for or_b(X,Y).
 * @param {Malleability} left
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const orBMalleability = (left, right) => ({
  dissat: Dissat.Unique,
  safe: left.safe && right.safe,
  nonMalleable:
    left.nonMalleable &&
    dissatIs(left.dissat, Dissat.Unique) &&
    right.nonMalleable &&
    dissatIs(right.dissat, Dissat.Unique) &&
    (left.safe || right.safe)
});

/**
 * Malleability rules for or_d(X,Y).
 * @param {Malleability} left
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const orDMalleability = (left, right) => ({
  dissat: right.dissat,
  safe: left.safe && right.safe,
  nonMalleable:
    left.nonMalleable &&
    dissatIs(left.dissat, Dissat.Unique) &&
    right.nonMalleable &&
    (left.safe || right.safe)
});

/**
 * Malleability rules for or_c(X,Y).
 * @param {Malleability} left
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const orCMalleability = (left, right) => ({
  dissat: Dissat.None,
  safe: left.safe && right.safe,
  nonMalleable:
    left.nonMalleable &&
    dissatIs(left.dissat, Dissat.Unique) &&
    right.nonMalleable &&
    (left.safe || right.safe)
});

/**
 * Malleability rules for or_i(X,Y).
 * @param {Malleability} left
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const orIMalleability = (left, right) => {
  let dissat;
  if (dissatIs(left.dissat, Dissat.None) && dissatIs(right.dissat, Dissat.None)) {
    dissat = Dissat.None;
  } else if (
    (dissatIs(left.dissat, Dissat.Unique) && dissatIs(right.dissat, Dissat.None)) ||
    (dissatIs(left.dissat, Dissat.None) && dissatIs(right.dissat, Dissat.Unique))
  ) {
    dissat = Dissat.Unique;
  } else {
    dissat = Dissat.Unknown;
  }
  return {
    dissat,
    safe: left.safe && right.safe,
    nonMalleable: left.nonMalleable && right.nonMalleable && (left.safe || right.safe)
  };
};

/**
 * Malleability rules for andor(X,Y,Z).
 * @param {Malleability} left
 * @param {Malleability} mid
 * @param {Malleability} right
 * @returns {Malleability}
 */
export const andOrMalleability = (left, mid, right) => {
  let dissat;
  if (
    (right.dissat === Dissat.Unique && mid.dissat === Dissat.None) ||
    (right.dissat === Dissat.Unique && left.safe)
  ) {
    dissat = Dissat.Unique;
  } else if (
    (right.dissat === Dissat.None && mid.dissat === Dissat.None) ||
    (right.dissat === Dissat.None && left.safe)
  ) {
    dissat = Dissat.None;
  } else {
    dissat = Dissat.Unknown;
  }
  return {
    dissat,
    safe: (left.safe || mid.safe) && right.safe,
    nonMalleable:
      left.nonMalleable &&
      right.nonMalleable &&
      dissatIs(left.dissat, Dissat.Unique) &&
      mid.nonMalleable &&
      (left.safe || mid.safe || right.safe)
  };
};

/**
 * Malleability rules for thresh(k, subs...).
 * @param {number} k
 * @param {Malleability[]} subs
 * @returns {Malleability}
 */
export const thresholdMalleability = (k, subs) => {
  const n = subs.length;
  let safeCount = 0;
  let allDissatUnique = true;
  let allNonMalleable = true;
  subs.forEach(sub => {
    safeCount += Number(sub.safe);
    allDissatUnique &&= dissatIs(sub.dissat, Dissat.Unique);
    allNonMalleable &&= sub.nonMalleable;
  });

  return {
    dissat: allDissatUnique && safeCount === n ? Dissat.Unique : Dissat.Unknown,
    safe: safeCount > n - k,
    nonMalleable: allNonMalleable && safeCount >= n - k && allDissatUnique
  };
};
