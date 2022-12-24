import bip68 from 'bip68';
import { maxLock, ABSOLUTE, RELATIVE } from '../src/satisfier/maxLock.js';
describe('maxLock', () => {
  test('throws an error if lockType is undefined', () => {
    expect(() => maxLock(1, 2)).toThrow('lockType must be specified');
  });

  test('should throw an error if lockType is not ABSOLUTE or RELATIVE', () => {
    expect(() => {
      maxLock(1, 2, 'INVALID');
    }).toThrow('lockType must be either "ABSOLUTE" or "RELATIVE"');
  });

  test('should throw an error if a and b are not integers', () => {
    expect(() => {
      maxLock('a', 2, ABSOLUTE);
    }).toThrow('nSequence/nLockTime must be an integer: a');
    expect(() => {
      maxLock(1.1, 1, ABSOLUTE);
    }).toThrow('nSequence/nLockTime must be an integer: 1.1');
  });

  test('returns undefined if a and b are undefined', () => {
    expect(maxLock(undefined, undefined, ABSOLUTE)).toBe(undefined);
    expect(maxLock(undefined, undefined, RELATIVE)).toBe(undefined);
  });

  test('should throw an error if nLockTime values are not both below 500000000 or both above or equal 500000000', () => {
    expect(() => {
      maxLock(1, 500000000, ABSOLUTE);
    }).toThrow(
      'nLockTime values must be either below 500000000 or both above or equal 500000000'
    );
    expect(() => {
      maxLock(500000000, 1, ABSOLUTE);
    }).toThrow(
      'nLockTime values must be either below 500000000 or both above or equal 500000000'
    );
  });

  test('should throw an error if a and b are not representing the same unit (seconds or blocks)', () => {
    expect(() => {
      maxLock(
        bip68.encode({ seconds: 1 * 512 }),
        bip68.encode({ blocks: 2 }),
        RELATIVE
      );
    }).toThrow('a and b must both be either represent seconds or block height');
  });

  test('should return the maximum value of a and b if both are specified', () => {
    expect(maxLock(1, 2, ABSOLUTE)).toBe(2);
    expect(maxLock(2, 1, ABSOLUTE)).toBe(2);
    expect(
      maxLock(
        bip68.encode({ seconds: 1 * 512 }),
        bip68.encode({ seconds: 2 * 512 }),
        RELATIVE
      )
    ).toBe(bip68.encode({ seconds: 2 * 512 }));
    expect(
      maxLock(
        bip68.encode({ seconds: 2 * 512 }),
        bip68.encode({ seconds: 1 * 512 }),
        RELATIVE
      )
    ).toBe(bip68.encode({ seconds: 2 * 512 }));
  });

  test('should return the value of a if b is not specified', () => {
    expect(maxLock(1, undefined, ABSOLUTE)).toBe(1);
    expect(maxLock(undefined, 1, ABSOLUTE)).toBe(1);
    expect(
      maxLock(bip68.encode({ seconds: 1 * 512 }), undefined, RELATIVE)
    ).toBe(bip68.encode({ seconds: 1 * 512 }));
    expect(
      maxLock(undefined, bip68.encode({ seconds: 1 * 512 }), RELATIVE)
    ).toBe(bip68.encode({ seconds: 1 * 512 }));
  });
});
