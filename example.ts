// Copyright (c) 2026 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license

//To run it: "npx tsx ./example.js"

const {
  compileMiniscript,
  analyzeMiniscript,
  satisfier
} = require('./dist/index');

(async () => {
  const miniscript = 'and_v(v:pk(key),and_v(v:after(10),after(20)))';
  const analysis = analyzeMiniscript(miniscript);
  const { asm, issane } = compileMiniscript(miniscript);
  const satisfactions = satisfier(miniscript);

  console.log({ miniscript, asm, issane, analysis, satisfactions });
})();
