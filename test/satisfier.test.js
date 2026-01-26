// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

import { satisfier, ready } from '../dist/index.js';
import { primitives, timeLocks, other, knowns } from './fixtures.js';

const createGroupTest = (description, fixtures) =>
  describe(description, () => {
    for (const [testName, fixture] of Object.entries(fixtures)) {
      const options =
        fixture.unknowns || fixture.knowns
          ? { unknowns: fixture.unknowns, knowns: fixture.knowns }
          : undefined;
      if (fixture.throws) {
        test(testName, () => {
          expect(() => {
            const result = satisfier(fixture.miniscript, options);
            return result;
          }).toThrow(fixture.throws);
        });
      } else {
        test(testName, () => {
          const result = satisfier(fixture.miniscript, options);
          expect(result.nonMalleableSats).toEqual(
            expect.arrayContaining(fixture.nonMalleableSats)
          );
          expect(result.nonMalleableSats).toHaveLength(
            fixture.nonMalleableSats.length
          );

          const malleableSats = fixture.malleableSats;
          const unknownSats = fixture.unknownSats || [];

          expect(result.malleableSats).toEqual(
            expect.arrayContaining(malleableSats)
          );
          expect(result.malleableSats).toHaveLength(malleableSats.length);
          expect(result.unknownSats).toEqual(
            expect.arrayContaining(unknownSats)
          );
          expect(result.unknownSats).toHaveLength(unknownSats.length);
        });
      }
    }
  });

describe('Satisfier', () => {
  beforeAll(async () => {
    await ready;
  });

  createGroupTest('Timelocks', timeLocks);
  createGroupTest('Primitives', primitives);
  createGroupTest('Other', other);
  createGroupTest('Knowns & unknowns combinations', knowns);
});
