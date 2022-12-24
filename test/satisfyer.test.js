import { primitives, timeLocks, other } from './fixtures.js';
import { satisfyer } from '../src/satisfyer/index.js';

const createGroupTest = (description, fixtures) =>
  describe(description, () => {
    for (const [testName, fixture] of Object.entries(fixtures)) {
      if (fixture.throws) {
        test(testName, () => {
          expect(() => satisfyer(fixture.miniscript, fixture.unknowns)).toThrow(
            fixture.throws
          );
        });
      } else {
        test(testName, () => {
          const result = satisfyer(fixture.miniscript, fixture.unknowns);
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
