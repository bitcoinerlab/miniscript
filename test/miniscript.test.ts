// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

import { primitives, timeLocks, other } from './fixtures';
import { compileMiniscript } from '../dist/index';

const createGroupTest = (description, fixtures) =>
  describe(description, () => {
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
