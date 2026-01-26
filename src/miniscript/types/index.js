// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

export * from './correctness.js';
export * from './malleability.js';

/**
 * Combine correctness and malleability into a single type record.
 * @param {Correctness} correctness
 * @param {Malleability} malleability
 * @returns {{correctness: Correctness, malleability: Malleability}}
 */
export const makeType = (correctness, malleability) => ({
  correctness,
  malleability
});
