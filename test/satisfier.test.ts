// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

import { satisfier, type SatisfierOptions } from '../dist/index';
import { primitives, timeLocks, other, knowns, tapscript } from './fixtures';
import type { Fixture, FixtureGroup } from './fixtures';

const buildOptions = (
  fixture: Fixture,
  overrides: Partial<SatisfierOptions> = {}
): SatisfierOptions => {
  const options: SatisfierOptions = {
    ...(fixture.unknowns ? { unknowns: fixture.unknowns } : {}),
    ...(fixture.knowns ? { knowns: fixture.knowns } : {}),
    ...(fixture.tapscript ? { tapscript: true } : {}),
    ...overrides
  };

  return Object.keys(options).length ? options : {};
};

const createGroupTest = (description: string, fixtures: FixtureGroup): void =>
  describe(description, () => {
    for (const [testName, fixture] of Object.entries(fixtures) as Array<
      [string, Fixture]
    >) {
      if (fixture.throws) {
        test(testName, () => {
          expect(() => {
            const result = satisfier(fixture.miniscript, buildOptions(fixture));
            return result;
          }).toThrow(fixture.throws);
        });
      } else {
        const nonMalleableSats = fixture.nonMalleableSats;
        const malleableSats = fixture.malleableSats;
        const unknownSats = fixture.unknownSats;

        test(`${testName} (computeUnknowns enabled)`, () => {
          const result = satisfier(
            fixture.miniscript,
            buildOptions(fixture, { computeUnknowns: true })
          );
          expect(result.nonMalleableSats).toEqual(
            expect.arrayContaining(nonMalleableSats)
          );
          expect(result.nonMalleableSats).toHaveLength(nonMalleableSats.length);

          expect(result.malleableSats).toEqual(
            expect.arrayContaining(malleableSats)
          );
          expect(result.malleableSats).toHaveLength(malleableSats.length);
          expect(result.unknownSats).toEqual(
            expect.arrayContaining(unknownSats)
          );
          expect(result.unknownSats).toHaveLength(unknownSats.length);
        });

        test(`${testName} (computeUnknowns disabled)`, () => {
          const prunedOptions = buildOptions(fixture, {
            computeUnknowns: false
          });
          const prunedResult = satisfier(fixture.miniscript, prunedOptions);
          expect(prunedResult.nonMalleableSats).toEqual(
            expect.arrayContaining(nonMalleableSats)
          );
          expect(prunedResult.nonMalleableSats).toHaveLength(
            nonMalleableSats.length
          );
          expect(prunedResult.malleableSats).toEqual(
            expect.arrayContaining(malleableSats)
          );
          expect(prunedResult.malleableSats).toHaveLength(malleableSats.length);
          expect(prunedResult.unknownSats).toBeUndefined();
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

describe('Satisfier limits', () => {
  test('computeUnknowns disabled reduces multi enumeration', () => {
    const keys = Array.from({ length: 20 }, (_, index) => `key${index + 1}`);
    const miniscript = `multi(4,${keys.join(',')})`;
    const knowns = keys.slice(0, 4).map(key => `<sig(${key})>`);
    const maxSolutions = 200;
    const noPruneOptions: SatisfierOptions = {
      knowns,
      computeUnknowns: true,
      maxSolutions
    };
    const prunedOptions: SatisfierOptions = {
      knowns,
      computeUnknowns: false,
      maxSolutions
    };

    expect(() => satisfier(miniscript, noPruneOptions)).toThrow(
      `Satisfactions limit exceeded (${maxSolutions}).`
    );

    const result = satisfier(miniscript, prunedOptions);

    expect(result.nonMalleableSats).toHaveLength(1);
    expect(result.malleableSats).toHaveLength(0);
    expect(result.unknownSats).toBeUndefined();
  });
});
