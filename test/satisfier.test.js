import { primitives, timeLocks, other } from './fixtures.js';
import { satisfier } from '../src/satisfier/index.js';

const createGroupTest = (description, fixtures) =>
  describe(description, () => {
    for (const [testName, fixture] of Object.entries(fixtures)) {
      if (fixture.throws) {
        test(testName, () => {
          expect(() => satisfier(fixture.miniscript, fixture.unknowns)).toThrow(
            fixture.throws
          );
        });
      } else {
        test(testName, () => {
          const result = satisfier(fixture.miniscript, fixture.unknowns);
          expect(result.nonMalleableSats).toEqual(
            expect.arrayContaining(fixture.nonMalleableSats)
          );
          expect(result.nonMalleableSats).toHaveLength(
            fixture.nonMalleableSats.length
          );

          const malleableSats = fixture.malleableSats;
          const unknownSats =
            fixture.unknowns && fixture.unknowns.length
              ? fixture.unknownSats
              : [];

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

createGroupTest('Primitives', primitives);
createGroupTest('Timelocks', timeLocks);
createGroupTest('Other', other);
