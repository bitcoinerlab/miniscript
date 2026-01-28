// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

import { primitives, timeLocks, other, tapscript } from './fixtures';
import type { Fixture, FixtureGroup } from './fixtures';
import { compileMiniscript } from '../dist/index';

const createGroupTest = (description: string, fixtures: FixtureGroup): void =>
  describe(description, () => {
    for (const [testName, fixture] of Object.entries(fixtures) as Array<
      [string, Fixture]
    >) {
      if (!fixture.throws) {
        test(testName, () => {
          if (!fixture.script) {
            throw new Error(`Missing script for fixture: ${testName}`);
          }
          const options = fixture.tapscript ? { tapscript: true } : undefined;
          const script = compileMiniscript(fixture.miniscript, options).asm;
          expect(script).toEqual(fixture.script);
        });
      }
    }
  });

createGroupTest('Primitives', primitives);
createGroupTest('Timelocks', timeLocks);
createGroupTest('Other', other);
createGroupTest('Tapscript', tapscript);

test('wrapper forms are equivalent', () => {
  const first = 'and_v(vc:pk_k(key1),c:pk_k(key2))';
  const second = 'and_v(v:c:pk_k(key1),c:pk_k(key2))';
  expect(compileMiniscript(first).asm).toEqual(compileMiniscript(second).asm);
});
