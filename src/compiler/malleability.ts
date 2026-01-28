// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

/**
 * Miniscript malleability helpers.
 * See COMPILER.md "Guaranteeing non-malleability" for details.
 */

/** Malleability flags for a miniscript fragment. */
export type Malleability = {
  signed: boolean;
  forced: boolean;
  expressive: boolean;
  nonMalleable: boolean;
};

const allNonMalleable = (malleabilities: Malleability[]): boolean =>
  malleabilities.every(malleability => malleability.nonMalleable);
const allExpressive = (malleabilities: Malleability[]): boolean =>
  malleabilities.every(malleability => malleability.expressive);
const countUnsigned = (malleabilities: Malleability[]): number =>
  malleabilities.reduce(
    (acc, malleability) => acc + Number(!malleability.signed),
    0
  );

export const trueMalleability: Malleability = {
  signed: false,
  forced: true,
  expressive: false,
  nonMalleable: true
};

export const falseMalleability: Malleability = {
  signed: true,
  forced: false,
  expressive: true,
  nonMalleable: true
};

// Malleability helpers return signed/forced/expressive plus nonMalleable.
export const pkMalleability = (): Malleability => ({
  signed: true,
  forced: false,
  expressive: true,
  nonMalleable: true
});

export const multiMalleability = (): Malleability => ({
  signed: true,
  forced: false,
  expressive: true,
  nonMalleable: true
});

export const hashMalleability = (): Malleability => ({
  signed: false,
  forced: false,
  expressive: false,
  nonMalleable: true
});

export const timeMalleability = (): Malleability => ({
  signed: false,
  forced: true,
  expressive: false,
  nonMalleable: true
});

/** Malleability rules for the `c:` wrapper. */
export const checkMalleability = (
  /** Child malleability to wrap. */
  malleability: Malleability
): Malleability => ({
  signed: true,
  forced: malleability.forced,
  expressive: malleability.expressive,
  nonMalleable: malleability.nonMalleable
});

/** Malleability rules for the `d:` wrapper. */
export const dupIfMalleability = (
  /** Child malleability to wrap. */
  malleability: Malleability
): Malleability => ({
  signed: malleability.signed,
  forced: false,
  expressive: true,
  nonMalleable: malleability.nonMalleable
});

/** Malleability rules for the `j:` wrapper. */
export const nonZeroMalleability = (
  /** Child malleability to wrap. */
  malleability: Malleability
): Malleability => ({
  signed: malleability.signed,
  forced: false,
  expressive: malleability.forced,
  nonMalleable: malleability.nonMalleable
});

/** Malleability rules for the `v:` wrapper. */
export const verifyMalleability = (
  /** Child malleability to wrap. */
  malleability: Malleability
): Malleability => ({
  signed: malleability.signed,
  forced: true,
  expressive: false,
  nonMalleable: malleability.nonMalleable
});

/** Malleability rules for and_b(X,Y). */
export const andBMalleability = (
  /** Left child malleability. */
  left: Malleability,
  /** Right child malleability. */
  right: Malleability
): Malleability => ({
  signed: left.signed || right.signed,
  forced:
    (left.forced && right.forced) ||
    (left.signed && left.forced) ||
    (right.signed && right.forced),
  expressive:
    left.expressive && right.expressive && left.signed && right.signed,
  nonMalleable: left.nonMalleable && right.nonMalleable
});

/** Malleability rules for and_v(X,Y). */
export const andVMalleability = (
  /** Left child malleability. */
  left: Malleability,
  /** Right child malleability. */
  right: Malleability
): Malleability => ({
  signed: left.signed || right.signed,
  forced: left.signed || right.forced,
  expressive: false,
  nonMalleable: left.nonMalleable && right.nonMalleable
});

/** Malleability rules for or_b(X,Y). */
export const orBMalleability = (
  /** Left child malleability. */
  left: Malleability,
  /** Right child malleability. */
  right: Malleability
): Malleability => ({
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

/** Malleability rules for or_d(X,Y). */
export const orDMalleability = (
  /** Left child malleability. */
  left: Malleability,
  /** Right child malleability. */
  right: Malleability
): Malleability => ({
  signed: left.signed && right.signed,
  forced: right.forced,
  expressive: right.expressive,
  nonMalleable:
    left.nonMalleable &&
    right.nonMalleable &&
    left.expressive &&
    (left.signed || right.signed)
});

/** Malleability rules for or_c(X,Y). */
export const orCMalleability = (
  /** Left child malleability. */
  left: Malleability,
  /** Right child malleability. */
  right: Malleability
): Malleability => ({
  signed: left.signed && right.signed,
  forced: true,
  expressive: false,
  nonMalleable:
    left.nonMalleable &&
    right.nonMalleable &&
    left.expressive &&
    (left.signed || right.signed)
});

/** Malleability rules for or_i(X,Y). */
export const orIMalleability = (
  /** Left child malleability. */
  left: Malleability,
  /** Right child malleability. */
  right: Malleability
): Malleability => ({
  signed: left.signed && right.signed,
  forced: left.forced && right.forced,
  expressive:
    (left.expressive && right.forced) || (right.expressive && left.forced),
  nonMalleable:
    left.nonMalleable && right.nonMalleable && (left.signed || right.signed)
});

/** Malleability rules for andor(X,Y,Z). */
export const andOrMalleability = (
  /** Left child malleability. */
  left: Malleability,
  /** Middle child malleability. */
  mid: Malleability,
  /** Right child malleability. */
  right: Malleability
): Malleability => ({
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

/** Malleability rules for thresh(k, subs...). */
export const thresholdMalleability = (
  /** Threshold to satisfy. */
  k: number,
  /** Child malleability list. */
  subs: Malleability[]
): Malleability => {
  const nonSignedCount = countUnsigned(subs);
  const signed = nonSignedCount <= k - 1;
  const expressive = subs.every(sub => sub.signed);
  return {
    signed,
    forced: false,
    expressive,
    nonMalleable:
      allNonMalleable(subs) && allExpressive(subs) && nonSignedCount <= k
  };
};
