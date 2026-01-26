/**
 * Miniscript static type system helpers.
 * Mirrors the correctness and malleability rules from the specification.
 * See ANALYZER.md "Correctness vs malleability" for details.
 */

/**
 * @typedef {Object} Correctness
 * @property {string} base
 * @property {string} input
 * @property {boolean} dissatisfiable
 * @property {boolean} unit
 */

/**
 * @typedef {Object} Malleability
 * @property {string} dissat
 * @property {boolean} safe
 * @property {boolean} nonMalleable
 */

/**
 * @typedef {Object} MiniscriptType
 * @property {Correctness} corr
 * @property {Malleability} mall
 */

export const Base = {
  B: 'B',
  K: 'K',
  V: 'V',
  W: 'W'
};

export const Input = {
  Zero: 'Zero',
  One: 'One',
  Any: 'Any',
  OneNonZero: 'OneNonZero',
  AnyNonZero: 'AnyNonZero'
};

export const Dissat = {
  None: 'None',
  Unique: 'Unique',
  Unknown: 'Unknown'
};

const INPUT_ONE = new Set([Input.One, Input.OneNonZero]);
const INPUT_NONZERO = new Set([Input.OneNonZero, Input.AnyNonZero]);

// Correctness helpers return { ok, corr, error? }.
// Leaf fragments are always ok and return their base correctness directly.
export const correctnessTrue = () =>
  ({
    ok: true,
    corr: {
      base: Base.B,
      input: Input.Zero,
      dissatisfiable: false,
      unit: true
    }
  });

export const correctnessFalse = () =>
  ({
    ok: true,
    corr: {
      base: Base.B,
      input: Input.Zero,
      dissatisfiable: true,
      unit: true
    }
  });

export const malleabilityTrue = {
  dissat: Dissat.None,
  safe: false,
  nonMalleable: true
};

export const malleabilityFalse = {
  dissat: Dissat.Unique,
  safe: true,
  nonMalleable: true
};

/**
 * Combine correctness and malleability into a single type record.
 * @param {Correctness} corr
 * @param {Malleability} mall
 * @returns {MiniscriptType}
 */
export const makeType = (corr, mall) => ({ corr, mall });

const dissatIs = (dissat, value) => dissat === value;

export const correctnessPkK = () =>
  ({
    ok: true,
    corr: {
      base: Base.K,
      input: Input.OneNonZero,
      dissatisfiable: true,
      unit: true
    }
  });

export const correctnessPkH = () =>
  ({
    ok: true,
    corr: {
      base: Base.K,
      input: Input.AnyNonZero,
      dissatisfiable: true,
      unit: true
    }
  });

export const correctnessMulti = () =>
  ({
    ok: true,
    corr: {
      base: Base.B,
      input: Input.AnyNonZero,
      dissatisfiable: true,
      unit: true
    }
  });

export const correctnessMultiA = () =>
  ({
    ok: true,
    corr: {
      base: Base.B,
      input: Input.Any,
      dissatisfiable: true,
      unit: true
    }
  });

export const correctnessHash = () =>
  ({
    ok: true,
    corr: {
      base: Base.B,
      input: Input.OneNonZero,
      dissatisfiable: true,
      unit: true
    }
  });

export const correctnessTime = () =>
  ({
    ok: true,
    corr: {
      base: Base.B,
      input: Input.Zero,
      dissatisfiable: false,
      unit: false
    }
  });

// Malleability helpers return Dissat/safe/nonMalleable for a fragment.
export const malleabilityPk = () => ({
  dissat: Dissat.Unique,
  safe: true,
  nonMalleable: true
});

export const malleabilityMulti = () => ({
  dissat: Dissat.Unique,
  safe: true,
  nonMalleable: true
});

export const malleabilityHash = () => ({
  dissat: Dissat.Unknown,
  safe: false,
  nonMalleable: true
});

export const malleabilityTime = () => ({
  dissat: Dissat.None,
  safe: false,
  nonMalleable: true
});

/**
 * Apply the `a:` wrapper to a correctness type.
 * @param {Correctness} corr
 * @returns {{ok: boolean, corr?: Correctness, error?: string}}
 */
export const castAlt = corr => {
  if (corr.base !== Base.B) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    corr: {
      base: Base.W,
      input: Input.Any,
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
export const castSwap = corr => {
  if (corr.base !== Base.B) return { ok: false, error: 'ChildBase1' };
  if (!INPUT_ONE.has(corr.input)) return { ok: false, error: 'SwapNonOne' };
  return {
    ok: true,
    corr: {
      base: Base.W,
      input: Input.Any,
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
export const castCheck = corr => {
  if (corr.base !== Base.K) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    corr: {
      base: Base.B,
      input: corr.input,
      dissatisfiable: corr.dissatisfiable,
      unit: true
    }
  };
};

/**
 * Apply the `d:` wrapper to a correctness type.
 * @param {Correctness} corr
 * @returns {{ok: boolean, corr?: Correctness, error?: string}}
 */
export const castDupIf = corr => {
  if (corr.base !== Base.V) return { ok: false, error: 'ChildBase1' };
  if (corr.input !== Input.Zero) return { ok: false, error: 'NonZeroDupIf' };
  return {
    ok: true,
    corr: {
      base: Base.B,
      input: Input.OneNonZero,
      dissatisfiable: true,
      unit: false
    }
  };
};

/**
 * Apply the `v:` wrapper to a correctness type.
 * @param {Correctness} corr
 * @returns {{ok: boolean, corr?: Correctness, error?: string}}
 */
export const castVerify = corr => {
  if (corr.base !== Base.B) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    corr: {
      base: Base.V,
      input: corr.input,
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
export const castNonZero = corr => {
  if (!INPUT_NONZERO.has(corr.input)) return { ok: false, error: 'NonZeroZero' };
  if (corr.base !== Base.B) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    corr: {
      base: Base.B,
      input: corr.input,
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
export const castZeroNotEqual = corr => {
  if (corr.base !== Base.B) return { ok: false, error: 'ChildBase1' };
  return {
    ok: true,
    corr: {
      base: Base.B,
      input: corr.input,
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
export const correctnessAndB = (left, right) => {
  if (left.base !== Base.B || right.base !== Base.W) {
    return { ok: false, error: 'ChildBase2' };
  }
  let input;
  if (left.input === Input.Zero && right.input === Input.Zero) {
    input = Input.Zero;
  } else if (
    (left.input === Input.Zero && right.input === Input.One) ||
    (left.input === Input.One && right.input === Input.Zero)
  ) {
    input = Input.One;
  } else if (
    (left.input === Input.Zero && right.input === Input.OneNonZero) ||
    (left.input === Input.OneNonZero && right.input === Input.Zero)
  ) {
    input = Input.OneNonZero;
  } else if (
    left.input === Input.OneNonZero ||
    left.input === Input.AnyNonZero ||
    (left.input === Input.Zero && right.input === Input.AnyNonZero)
  ) {
    input = Input.AnyNonZero;
  } else {
    input = Input.Any;
  }
  return {
    ok: true,
    corr: {
      base: Base.B,
      input,
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
export const correctnessAndV = (left, right) => {
  if (left.base !== Base.V || ![Base.B, Base.K, Base.V].includes(right.base)) {
    return { ok: false, error: 'ChildBase2' };
  }
  let input;
  if (left.input === Input.Zero && right.input === Input.Zero) {
    input = Input.Zero;
  } else if (
    (left.input === Input.Zero && right.input === Input.One) ||
    (left.input === Input.One && right.input === Input.Zero)
  ) {
    input = Input.One;
  } else if (
    (left.input === Input.Zero && right.input === Input.OneNonZero) ||
    (left.input === Input.OneNonZero && right.input === Input.Zero)
  ) {
    input = Input.OneNonZero;
  } else if (
    left.input === Input.OneNonZero ||
    left.input === Input.AnyNonZero ||
    (left.input === Input.Zero && right.input === Input.AnyNonZero)
  ) {
    input = Input.AnyNonZero;
  } else {
    input = Input.Any;
  }
  return {
    ok: true,
    corr: {
      base: right.base,
      input,
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
export const correctnessOrB = (left, right) => {
  if (!left.dissatisfiable) return { ok: false, error: 'LeftNotDissatisfiable' };
  if (!right.dissatisfiable) return { ok: false, error: 'RightNotDissatisfiable' };
  if (left.base !== Base.B || right.base !== Base.W) {
    return { ok: false, error: 'ChildBase2' };
  }
  let input;
  if (left.input === Input.Zero && right.input === Input.Zero) {
    input = Input.Zero;
  } else if (
    (left.input === Input.Zero && right.input === Input.One) ||
    (left.input === Input.One && right.input === Input.Zero) ||
    (left.input === Input.Zero && right.input === Input.OneNonZero) ||
    (left.input === Input.OneNonZero && right.input === Input.Zero)
  ) {
    input = Input.One;
  } else {
    input = Input.Any;
  }
  return {
    ok: true,
    corr: {
      base: Base.B,
      input,
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
export const correctnessOrD = (left, right) => {
  if (!left.dissatisfiable) return { ok: false, error: 'LeftNotDissatisfiable' };
  if (!left.unit) return { ok: false, error: 'LeftNotUnit' };
  if (left.base !== Base.B || right.base !== Base.B) {
    return { ok: false, error: 'ChildBase2' };
  }
  let input;
  if (left.input === Input.Zero && right.input === Input.Zero) {
    input = Input.Zero;
  } else if (
    (left.input === Input.One && right.input === Input.Zero) ||
    (left.input === Input.OneNonZero && right.input === Input.Zero)
  ) {
    input = Input.One;
  } else {
    input = Input.Any;
  }
  return {
    ok: true,
    corr: {
      base: Base.B,
      input,
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
export const correctnessOrC = (left, right) => {
  if (!left.dissatisfiable) return { ok: false, error: 'LeftNotDissatisfiable' };
  if (!left.unit) return { ok: false, error: 'LeftNotUnit' };
  if (left.base !== Base.B || right.base !== Base.V) {
    return { ok: false, error: 'ChildBase2' };
  }
  let input;
  if (left.input === Input.Zero && right.input === Input.Zero) {
    input = Input.Zero;
  } else if (
    (left.input === Input.One && right.input === Input.Zero) ||
    (left.input === Input.OneNonZero && right.input === Input.Zero)
  ) {
    input = Input.One;
  } else {
    input = Input.Any;
  }
  return {
    ok: true,
    corr: {
      base: Base.V,
      input,
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
export const correctnessOrI = (left, right) => {
  const basePair = `${left.base}:${right.base}`;
  if (![`${Base.B}:${Base.B}`, `${Base.V}:${Base.V}`, `${Base.K}:${Base.K}`].includes(basePair)) {
    return { ok: false, error: 'ChildBase2' };
  }
  return {
    ok: true,
    corr: {
      base: left.base,
      input:
        left.input === Input.Zero && right.input === Input.Zero
          ? Input.One
          : Input.Any,
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
export const correctnessAndOr = (left, mid, right) => {
  if (!left.dissatisfiable) return { ok: false, error: 'LeftNotDissatisfiable' };
  if (!left.unit) return { ok: false, error: 'LeftNotUnit' };
  const baseTriplet = `${left.base}:${mid.base}:${right.base}`;
  if (
    ![
      `${Base.B}:${Base.B}:${Base.B}`,
      `${Base.B}:${Base.K}:${Base.K}`,
      `${Base.B}:${Base.V}:${Base.V}`
    ].includes(baseTriplet)
  ) {
    return { ok: false, error: 'ChildBase3' };
  }
  let input;
  if (
    left.input === Input.Zero &&
    mid.input === Input.Zero &&
    right.input === Input.Zero
  ) {
    input = Input.Zero;
  } else if (
    (left.input === Input.Zero &&
      INPUT_ONE.has(mid.input) &&
      INPUT_ONE.has(right.input)) ||
    (INPUT_ONE.has(left.input) &&
      mid.input === Input.Zero &&
      right.input === Input.Zero)
  ) {
    input = Input.One;
  } else {
    input = Input.Any;
  }
  return {
    ok: true,
    corr: {
      base: mid.base,
      input,
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
export const correctnessThresh = (k, subs) => {
  let numArgs = 0;
  for (let i = 0; i < subs.length; i++) {
    const subtype = subs[i];
    numArgs +=
      subtype.input === Input.Zero
        ? 0
        : subtype.input === Input.One || subtype.input === Input.OneNonZero
          ? 1
          : 2;
    if (i === 0 && subtype.base !== Base.B) {
      return { ok: false, error: 'ThresholdBase' };
    }
    if (i !== 0 && subtype.base !== Base.W) {
      return { ok: false, error: 'ThresholdBase' };
    }
    if (!subtype.unit) {
      return { ok: false, error: 'ThresholdNonUnit' };
    }
    if (!subtype.dissatisfiable) {
      return { ok: false, error: 'ThresholdDissat' };
    }
  }
  const input = numArgs === 0 ? Input.Zero : numArgs === 1 ? Input.One : Input.Any;
  return {
    ok: true,
    corr: {
      base: Base.B,
      input,
      dissatisfiable: true,
      unit: true
    }
  };
};

/**
 * Malleability rules for the `d:` and `j:` wrappers.
 * @param {Malleability} mall
 * @returns {Malleability}
 */
export const castMalleabilityDupIf = mall => ({
  dissat: dissatIs(mall.dissat, Dissat.None) ? Dissat.Unique : Dissat.Unknown,
  safe: mall.safe,
  nonMalleable: mall.nonMalleable
});

/**
 * Malleability rules for the `v:` wrapper.
 * @param {Malleability} mall
 * @returns {Malleability}
 */
export const castMalleabilityVerify = mall => ({
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
