// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

export * from './correctness';
export * from './malleability';

import type { Correctness } from './correctness';
import type { Malleability } from './malleability';

/** Combined correctness and malleability record. */
export type MiniscriptType = {
  correctness: Correctness;
  malleability: Malleability;
};

/** Combine correctness and malleability into a single type record. */
export const makeType = (
  /** Correctness flags to combine. */
  correctness: Correctness,
  /** Malleability flags to combine. */
  malleability: Malleability
): MiniscriptType => ({ correctness, malleability });
