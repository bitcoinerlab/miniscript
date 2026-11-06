// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

import { analyzeMiniscript } from '../dist/index';

type AnalyzeCase = {
  name: string;
  miniscript: string;
  context?: { tapscript?: boolean };
  expect: {
    valid?: boolean;
    issane?: boolean;
    error?: string | null;
  };
};

const cases: AnalyzeCase[] = [
  {
    name: 'multi_a requires tapscript',
    miniscript: 'multi_a(1,key1,key2)',
    expect: {
      valid: false,
      error: 'multi_a() is only valid in tapscript'
    }
  },
  {
    name: 'multi_a is valid in tapscript',
    miniscript: 'multi_a(1,key1,key2)',
    context: { tapscript: true },
    expect: { valid: true, issane: true, error: null }
  },
  {
    name: 'multi is invalid in tapscript',
    miniscript: 'multi(1,key1,key2)',
    context: { tapscript: true },
    expect: { valid: false, error: 'multi() is not valid in tapscript' }
  },
  {
    name: 'd wrapper is non-unit in legacy',
    miniscript: 'or_d(d:v:1,pk(key2))',
    expect: { valid: false, error: 'or_d: left child must be unit' }
  },
  {
    name: 'd wrapper is unit in tapscript',
    miniscript: 'or_d(d:v:1,pk(key2))',
    context: { tapscript: true },
    expect: { valid: true }
  },
  {
    name: 'duplicate keys are not sane',
    miniscript: 'multi(1,key1,key1)',
    expect: { valid: true, issane: false, error: 'repeated public keys' }
  }
];

describe('Analyze tapscript context', () => {
  for (const testCase of cases) {
    test(testCase.name, () => {
      const analysis = analyzeMiniscript(testCase.miniscript, testCase.context);
      if (typeof testCase.expect.valid !== 'undefined') {
        expect(analysis.valid).toBe(testCase.expect.valid);
      }
      if (typeof testCase.expect.issane !== 'undefined') {
        expect(analysis.issane).toBe(testCase.expect.issane);
      }
      if (typeof testCase.expect.error !== 'undefined') {
        if (testCase.expect.error === null) {
          expect(analysis.error).toBeNull();
        } else {
          expect(analysis.error || '').toContain(testCase.expect.error);
        }
      }
    });
  }
});

const nKeys = (n: number): string =>
  Array.from({ length: n }, (_, i) => `key${i + 1}`).join(',');

describe('multi pubkey count', () => {
  test('rejects multi with more than 20 pubkeys', () => {
    expect(() => analyzeMiniscript(`multi(2,${nKeys(21)})`)).toThrow(
      /at most 20 keys/
    );
  });

  test('accepts multi with 20 pubkeys', () => {
    const analysis = analyzeMiniscript(`multi(2,${nKeys(20)})`);
    expect(analysis.valid).toBe(true);
    expect(analysis.error).toBeNull();
  });

  // multi_a maps to CHECKSIGADD, not CHECKMULTISIG (limit 999, not 20).
  test('multi_a with more than 20 pubkeys is valid in tapscript', () => {
    const analysis = analyzeMiniscript(`multi_a(2,${nKeys(21)})`, {
      tapscript: true
    });
    expect(analysis.valid).toBe(true);
    expect(analysis.error).toBeNull();
  });
});
