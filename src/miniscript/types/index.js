// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

export * from './correctness.js';
export * from './malleability.js';

/**
 * Combine correctness and malleability into a single type record.
 * @param {Correctness} corr
 * @param {Malleability} mall
 * @returns {{corr: Correctness, mall: Malleability}}
 */
export const makeType = (corr, mall) => ({ corr, mall });
