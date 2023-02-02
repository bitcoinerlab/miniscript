import { primitives, timeLocks, other, knowns } from './fixtures.js';
import { satisfier } from '../src/satisfier/index.js';

const createGroupTest = (description, fixtures) =>
  describe(description, () => {
    for (const [testName, fixture] of Object.entries(fixtures)) {
      const options =
        fixture.unknowns || fixture.knowns
          ? { unknowns: fixture.unknowns, knowns: fixture.knowns }
          : undefined;
      if (fixture.throws) {
        test(testName, () => {
          expect(() => satisfier(fixture.miniscript, options)).toThrow(
            fixture.throws
          );
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

createGroupTest('Timelocks', timeLocks);
createGroupTest('Primitives', primitives);
createGroupTest('Other', other);
createGroupTest('Knowns & unknowns combinations', knowns);
