// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

import { satisfier } from '../dist/index';
import { primitives, timeLocks, other, knowns, tapscript } from './fixtures';
import type { Fixture, FixtureGroup } from './fixtures';

type SatisfierOptions = {
  unknowns?: string[];
  knowns?: string[];
  tapscript?: boolean;
};

const createGroupTest = (description: string, fixtures: FixtureGroup): void =>
  describe(description, () => {
    for (const [testName, fixture] of Object.entries(fixtures) as Array<
      [string, Fixture]
    >) {
      const options: SatisfierOptions | undefined =
        fixture.unknowns || fixture.knowns || fixture.tapscript
          ? {
              ...(fixture.unknowns ? { unknowns: fixture.unknowns } : {}),
              ...(fixture.knowns ? { knowns: fixture.knowns } : {}),
              ...(fixture.tapscript ? { tapscript: true } : {})
            }
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
          if (!fixture.nonMalleableSats || !fixture.malleableSats) {
            throw new Error(`Missing sats for fixture: ${testName}`);
          }
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
  createGroupTest('Timelocks', timeLocks);
  createGroupTest('Primitives', primitives);
  createGroupTest('Other', other);
  createGroupTest('Tapscript', tapscript);
  createGroupTest('Knowns & unknowns combinations', knowns);
});
