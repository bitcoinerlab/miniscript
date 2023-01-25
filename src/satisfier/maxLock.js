// Copyright (c) 2022 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

/** @module maxLock */
import bip68 from 'bip68';

export const ABSOLUTE = 'ABSOLUTE';
export const RELATIVE = 'RELATIVE';

/**
 * Calculates the maximum lock time value between two lock time values (a and b)
 * using the specified lock type (ABSOLUTE or RELATIVE).
 * It asserts that there are no timeLock mixings.
 * It asserts that a or b are correctly encoded in bip68 format if they are
 * RELATIVE.
 * Either both a and b are block based or time based.
 * https://medium.com/blockstream/dont-mix-your-timelocks-d9939b665094
 *
 * If only a or b is undefined it asserts the value and returns it.
 * If none are defined it returns undefined.
 * @param {string|number} [a] - The first lock time value to compare.
 * @param {string|number} [b] - The second lock time value to compare.
 * @param {string} lockType - The type of lock time to use. Can be either "ABSOLUTE" or "RELATIVE".
 * @return {number} - The maximum lock time value between a and b.
 */

export function maxLock(a, b, lockType) {
  if (typeof a === 'undefined' && typeof b === 'undefined') {
    return undefined;
  }
  if (typeof lockType === 'undefined')
    throw new Error('lockType must be specified');
  // Check that lockType is either "ABSOLUTE" or "RELATIVE"
  if (lockType !== ABSOLUTE && lockType !== RELATIVE)
    throw new Error('lockType must be either "ABSOLUTE" or "RELATIVE"');

  function isInteger(number) {
    const isNumeric = !isNaN(number) && !isNaN(parseFloat(number));
    if (isNumeric && Number.isInteger(Number(number))) return true;
    else return false;
  }
  if (typeof a !== 'undefined') {
    if (isInteger(a) === false)
      throw new Error('nSequence/nLockTime must be an integer: ' + a);
    a = Number(a);
    if (
      lockType === RELATIVE &&
      !bip68.decode(a).hasOwnProperty('seconds') &&
      !bip68.decode(a).hasOwnProperty('blocks')
    )
      throw new Error('Invalid bip68 encoded a value: ' + a);
  }
  if (typeof b !== 'undefined') {
    if (isInteger(b) === false)
      throw new Error('nSequence/nLockTime must be an integer: ' + b);
    b = Number(b);
    if (
      lockType === RELATIVE &&
      !bip68.decode(b).hasOwnProperty('seconds') &&
      !bip68.decode(b).hasOwnProperty('blocks')
    )
      throw new Error('Invalid bip68 encoded b value: ' + b);
  }

  if (typeof a !== 'undefined' && typeof b !== 'undefined') {
    if (lockType === ABSOLUTE) {
      // Both a and b must be either below 500000000 or both above or equal 500000000
      if (
        (a < 500000000 && b >= 500000000) ||
        (a >= 500000000 && b < 500000000)
      ) {
        throw new Error(
          'nLockTime values must be either below 500000000 or both above or equal 500000000'
        );
      }
    } else {
      const decodedA = bip68.decode(a);
      const decodedB = bip68.decode(b);

      if (
        decodedA.hasOwnProperty('seconds') !==
        decodedB.hasOwnProperty('seconds')
      ) {
        throw new Error(
          'a and b must both be either represent seconds or block height'
        );
      }
    }
    return Math.max(a, b);
  }

  if (typeof a !== 'undefined') return a;
  if (typeof b !== 'undefined') return b;
  return undefined;
}
