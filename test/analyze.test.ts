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
      error: 'multi_a() is only valid in tapscript. Pass { tapscript: true }.'
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
    expect: { valid: false, error: 'LeftNotUnit' }
  },
  {
    name: 'd wrapper is unit in tapscript',
    miniscript: 'or_d(d:v:1,pk(key2))',
    context: { tapscript: true },
    expect: { valid: true }
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
        expect(analysis.error).toBe(testCase.expect.error);
      }
    });
  }
});
