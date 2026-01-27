// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

import { primitives, timeLocks, other } from './fixtures.js';
import { compileMiniscript, ready } from '../dist/index.js';

const createGroupTest = (description, fixtures) =>
  describe(description, () => {
    beforeAll(async () => {
      await ready;
    });
    for (const [testName, fixture] of Object.entries(fixtures)) {
      if (!fixture.throws) {
        test(testName, () => {
          const script = compileMiniscript(fixture.miniscript).asm;
          expect(script).toEqual(fixture.script);
        });
      }
    }
  });

createGroupTest('Primitives', primitives);
createGroupTest('Timelocks', timeLocks);
createGroupTest('Other', other);
