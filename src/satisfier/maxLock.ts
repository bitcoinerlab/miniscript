// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

// @ts-expect-error No types available for bip68
import bip68 from 'bip68';

export type LockType = 'ABSOLUTE' | 'RELATIVE';

type Bip68DecodeResult = {
  seconds?: number;
  blocks?: number;
};

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
 */

export function maxLock(
  /** The first lock time value to compare. */
  a?: string | number,
  /** The second lock time value to compare. */
  b?: string | number,
  /** The type of lock time to use. */
  lockType?: LockType
): number | undefined {
  if (typeof a === 'undefined' && typeof b === 'undefined') {
    return undefined;
  }
  if (typeof lockType === 'undefined')
    throw new Error('lockType must be specified');
  // Check that lockType is either "ABSOLUTE" or "RELATIVE"
  if (lockType !== 'ABSOLUTE' && lockType !== 'RELATIVE')
    throw new Error('lockType must be either "ABSOLUTE" or "RELATIVE"');

  const isInteger = (value: string | number): boolean => {
    const isNumeric =
      !isNaN(value as number) && !isNaN(parseFloat(String(value)));
    if (isNumeric && Number.isInteger(Number(value))) return true;
    return false;
  };

  let aValue: number | undefined;
  let bValue: number | undefined;
  let decodedA: Bip68DecodeResult | undefined;
  let decodedB: Bip68DecodeResult | undefined;

  if (typeof a !== 'undefined') {
    if (isInteger(a) === false)
      throw new Error('nSequence/nLockTime must be an integer: ' + a);
    aValue = Number(a);
    if (lockType === 'RELATIVE') {
      decodedA = bip68.decode(aValue) as Bip68DecodeResult;
      if (!('seconds' in decodedA) && !('blocks' in decodedA))
        throw new Error('Invalid bip68 encoded a value: ' + aValue);
    }
  }
  if (typeof b !== 'undefined') {
    if (isInteger(b) === false)
      throw new Error('nSequence/nLockTime must be an integer: ' + b);
    bValue = Number(b);
    if (lockType === 'RELATIVE') {
      decodedB = bip68.decode(bValue) as Bip68DecodeResult;
      if (!('seconds' in decodedB) && !('blocks' in decodedB))
        throw new Error('Invalid bip68 encoded b value: ' + bValue);
    }
  }

  if (typeof aValue !== 'undefined' && typeof bValue !== 'undefined') {
    if (lockType === 'ABSOLUTE') {
      // Both a and b must be either below 500000000 or both above or equal 500000000
      if (
        (aValue < 500000000 && bValue >= 500000000) ||
        (aValue >= 500000000 && bValue < 500000000)
      ) {
        throw new Error(
          'nLockTime values must be either below 500000000 or both above or equal 500000000'
        );
      }
    } else {
      if (!decodedA || !decodedB)
        throw new Error('Invalid bip68 encoded value');
      if ('seconds' in decodedA !== 'seconds' in decodedB) {
        throw new Error(
          'a and b must both be either represent seconds or block height'
        );
      }
    }
    return Math.max(aValue, bValue);
  }

  if (typeof aValue !== 'undefined') return aValue;
  if (typeof bValue !== 'undefined') return bValue;
  return undefined;
}
