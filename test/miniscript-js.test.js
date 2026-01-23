import { primitives, timeLocks, other } from './fixtures.js';
import { compileMiniscriptJs, ready } from '../dist/index.js';

const createGroupTest = (description, fixtures) =>
  describe(description, () => {
    beforeAll(async () => {
      await ready;
    });
    for (const [testName, fixture] of Object.entries(fixtures)) {
      if (!fixture.throws) {
        test(testName, () => {
          const script = compileMiniscriptJs(fixture.miniscript).asm;
          expect(script).toEqual(fixture.script);
        });
      }
    }
  });

createGroupTest('Primitives (JS)', primitives);
createGroupTest('Timelocks (JS)', timeLocks);
createGroupTest('Other (JS)', other);
